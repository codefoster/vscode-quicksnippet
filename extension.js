var vscode = require('vscode');
var path = require('path');
var fs = require('fs');
var json = require('comment-json');
var prependFile = require('prepend-file');

var DEFAULT_SNIPPET_NAME = 'My Snippet Name: REPLACE OR IT WILL BE OVERWRITTEN';
var SNIPPET_TEMPLATE_NAME = 'snippet-comment-template.txt';

// this method is called when the extension is activated
exports.activate = function activate(context) {
    console.log('Extension "create-snippet" is now active!');
    SNIPPET_TEMPLATE_NAME = path.join(context.extensionPath, SNIPPET_TEMPLATE_NAME);
    var disposable = vscode.commands.registerCommand(
        'extension.createSnippet',
        function() {
            var editor = vscode.window.activeTextEditor;
            if (!editor) {
                // Don't open text editor
                return;
            }

            var snippetFilename = getSnippetFilename(editor);

            fs.exists(snippetFilename, function(exists) {
                if (!exists) {
                    fs.writeFileSync(snippetFilename, '{ }', {encoding: 'utf8'});
                }
                createSnippet(snippetFilename, editor);
            });
        });

    context.subscriptions.push(disposable);
};

function createSnippet(snippetFilename, editor) {
    fs.readFile(snippetFilename, 'utf8', function(e, data) {
        console.log(data);
        var jsonData = (data ? json.parse(data, null, false) : {});
        jsonData = addSelectedSnippet(jsonData, editor);
        updateSnippetFile(snippetFilename, jsonData);
    });
}

function addSelectedSnippet(jsonData, editor) {
    var newJsonData = {};

    var snippetBody = getSnippetBody(editor);

    if (typeof (jsonData['//$']) !== 'undefined') {
        // newJsonData['//$'] = jsonData['//$'];
    }

    newJsonData[DEFAULT_SNIPPET_NAME] = {
        prefix: 'yourPrefixHere',
        body: snippetBody,
        description: 'Your snippet description here.'
    };

    for (var key in jsonData) {
        if (key !== DEFAULT_SNIPPET_NAME && key !== '//$') {
            newJsonData[key] = jsonData[key];
        }
    }
    console.log(newJsonData);
    return newJsonData;
}

function getSnippetFilename(editor) {
    var userDataPath = process.env.APPDATA ||
        (process.platform === 'darwin' ?
        process.env.HOME + 'Library/Preference' : '/var/local');

    return path.join(
        userDataPath,
        'Code', 'User', 'snippets',
        editor.document.languageId + '.json');
}

function getSnippetBody(editor) {
    var selection = editor.document.getText(editor.selection);

    var snippetParts = (selection + '$1').split(/\r?\n/);

    snippetParts[0] = snippetParts[0].trimLeft();

    var trimLast = snippetParts[snippetParts.length - 1].trimLeft();
    var trimLastLength = snippetParts[snippetParts.length - 1].length - trimLast.length;
    snippetParts[snippetParts.length - 1] = trimLast;

    for (var i = 0; i < snippetParts.length; i++) {
        snippetParts[i] = snippetParts[i].trimRight();
        if (i === 0 || i === snippetParts.length - 1) {
            continue;
        }
        var trim = snippetParts[i].trimLeft();
        var trimLength = snippetParts[i].length - trim.length;
        var trimCharacter = snippetParts[i][0];
        snippetParts[i] =
            Array(Math.max(trimLength - trimLastLength + 1, 0))
            .join(trimCharacter) + trim;
    }
    return snippetParts;
}

function updateSnippetFile(snippetFilename, jsonData) {
    console.log(jsonData);
    fs.writeFile(
        snippetFilename,
        json.stringify(jsonData, null, ' '), {encoding: 'utf8'},
        function(err) {
            if (err) {
                throw err;
            }

            // don't see the need to write a comment and it's doing it for each snippet creation
            // var snippetComment = fs.readFileSync(SNIPPET_TEMPLATE_NAME, 'utf8').replace('$(languageId)', path.basename(snippetFilename));
            // var current = fs.readFileSync(snippetFilename, 'utf8');
            // if (!current.startsWith(snippetComment)) {
            //     prependFile.sync(snippetFilename, snippetComment, {encoding: 'utf8'});
            // }
            
            //TODO: after we figure out how to prompt the user for the snippet name, 
            //it won't be necessary to launch the snippet file anymore 
            vscode.workspace.openTextDocument(snippetFilename).then(function(doc) {
                vscode.window.showTextDocument(doc, vscode.ViewColumn.Two)
                .then(selectDefaultSnippet);
            });
        }
    );
}

function selectDefaultSnippet() {
    var editor = vscode.window.activeTextEditor;
    var index = editor.document.getText().indexOf(DEFAULT_SNIPPET_NAME);
    editor.selection = new vscode.Selection(
        editor.document.positionAt(index),
        editor.document.positionAt(index + DEFAULT_SNIPPET_NAME.length)
    );
}
