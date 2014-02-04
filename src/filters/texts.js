
var TEXT_DIFF = 2;
var cachedDiffPatch = null;

var get_diff_match_patch = function(){
    if (!cachedDiffPatch) {
        var diff_match_patch = require('../../lib/diff_match_patch_uncompressed');
        var instance = new diff_match_patch.diff_match_patch();
        cachedDiffPatch = {
            diff: function(txt1, txt2){
                return instance.patch_toText(instance.patch_make(txt1, txt2));
            },
            patch: function(txt1, patch){
                var results = instance.patch_apply(instance.patch_fromText(patch), txt1);
                for (var i = 0; i < results[1].length; i++) {
                    if (!results[1][i]) {
                        var error = new Error('text patch failed');
                        error.textPatchFailed = true;
                    }
                }
                return results[0];
            }
        };
    }
    return cachedDiffPatch;
};

var DiffFilter = function TextsDiffFilter(context) {
    if (context.leftType !== 'string') return;
    if (context.left.length < 60 || context.right.length < 60) {
        context.setResult([context.left, context.right]).exit();
        return;
    }
    // large text, use a text-diff algorithm
    var diff = get_diff_match_patch().diff;
    context.setResult([diff(context.left, context.right), 0, TEXT_DIFF]).exit();
};

var PatchFilter = function TextsPatchFilter(context) {
    if (context.nested) return;
    if (context.delta[2] !== TEXT_DIFF) return;

    // text-diff, use a text-patch algorithm
    var patch = get_diff_match_patch().patch;
    context.setResult(patch(context.left, context.delta[0])).exit();
};

var textDeltaReverse = function(delta){
    var i, l, lines, line, lineTmp, header = null, headerRegex = /^@@ +\-(\d+),(\d+) +\+(\d+),(\d+) +@@$/, lineHeader, lineAdd, lineRemove;
    lines = delta.split('\n');
    for (i = 0, l = lines.length; i<l; i++) {
        line = lines[i];
        var lineStart = line.slice(0,1);
        if (lineStart==='@'){
            header = headerRegex.exec(line);
            lineHeader = i;
            lineAdd = null;
            lineRemove = null;

            // fix header
            lines[lineHeader] = '@@ -' + header[3] + ',' + header[4] + ' +' + header[1] + ',' + header[2] + ' @@';
        } else if (lineStart == '+'){
            lineAdd = i;
            lines[i] = '-' + lines[i].slice(1);
            if (lines[i-1].slice(0,1)==='+') {
                // swap lines to keep default order (-+)
                lineTmp = lines[i];
                lines[i] = lines[i-1];
                lines[i-1] = lineTmp;
            }
        } else if (lineStart == '-'){
            lineRemove = i;
            lines[i] = '+' + lines[i].slice(1);
        }
    }
    return lines.join('\n');
};

var ReverseFilter = function TextsReverseFilter(context) {
    if (context.nested) return;
    if (context.delta[2] !== TEXT_DIFF) return;

    // text-diff, use a text-diff algorithm
    context.setResult([textDeltaReverse(context.delta[0]), 0, TEXT_DIFF]).exit();
};

exports.DiffFilter = DiffFilter;
exports.PatchFilter = PatchFilter;
exports.ReverseFilter = ReverseFilter;