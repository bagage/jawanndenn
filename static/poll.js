/* Copyright (C) 2016 Sebastian Pipping <sebastian@pipping.org>
** Licensed under GPL v3 or later
*/
var INPLACE_LABEL_CLASS = 'inplace-label';

var Mode = {
    PREVIEW: true,
    LIVE: false,
}

var _addHeaderRow = function(table, options) {
    var tr = table.child( tag('tr') );
    tr.child( tag('td') );
    $.each( options, function( i, option ) {
        tr.child( tag('td', {
                class: 'optionLabel'
            }) ).child( option );
    })
    tr.child( tag('td') );
}

var _addExistingVoteRows = function(table, options, votes) {
    var votesPerOption = [];
    $.each( options, function( j, option ) {
        votesPerOption.push( 0 );
    })
    $.each( votes, function( i, personVotes ) {
        var person = personVotes[0];
        var votes = personVotes[1];

        var tr = table.child( tag('tr') );
        tr.child( tag('td', {
                    class: 'person',
                }) ).child( person );
        $.each( options, function( j, option ) {
            var checkBoxAttr = {
                        type: 'checkbox',
                        disabled: 'disabled',
                    };
            if (votes[j]) {
                checkBoxAttr.checked = true;
                votesPerOption[j] = (votesPerOption[j] + 1);
            }
            var checkbox = tag('input', checkBoxAttr);
            tr.child( tag('td', {
                        class: 'vote',
                    }) ).child( checkbox );
        })
        tr.child( tag('td') );
    })
    return votesPerOption;
}

var _addCurrentPersonRow = function(table, options, previewMode) {
    var tr = table.child( tag('tr') );
    var inputAttr = {
                id: 'voterName',
                name: 'voterName',
                type: 'text',
                class: 'person',
                title: 'Your name'
            };
    if (! previewMode) {
        // NOTE: onchange fires "too late"
        inputAttr.onkeydown = 'onChangeVoterName(this);';
    }
    tr.child( tag('td') ).child( tag('input', inputAttr) );

    $.each( options, function( j, option ) {
        var checkbox = tag('input', {
                    type: 'checkbox',
                    id: 'option' + j,
                    name: 'option' + j,
                    onclick: 'onClickCheckBox(this);'
                });
        tr.child( tag('td', {
                class: 'vote',
            })).child( checkbox );
    })
    var toolsTd = tr.child( tag('td') );
    toolsTd.child( tag('input', {
                id: 'submitVote',
                type: 'submit',
                disabled: 'disabled',
                value: 'Save',
            }));
}

var _addSummaryRow = function(table, options, votesPerOption) {
    var tr = table.child( tag('tr') );
    tr.child( tag('td') );
    $.each( options, function( j, option ) {
        var tdAttr = {
                    class: 'vote',
                    id: 'sum' + j,
                }
        if (votesPerOption[j] > 0) {
            tdAttr.class += ' sumNonZero';
        }
        tr.child( tag('td', tdAttr) ).child( votesPerOption[j] );
    })
    tr.child( tag('td') );
}


var createPollHtml = function(config, votes, previewMode) {
    var div = tag('div');
    div.child( tag('h2', {
                class: 'question'
            }) ).child( config.title );

    var form = div.child( tag('form', {
                id: 'pollForm',
                method: 'POST',
            }));
    var table = form.child( tag('table', {
            id: 'pollTable'
            }) );

    _addHeaderRow(table, config.options);
    var votesPerOption = _addExistingVoteRows(table, config.options, votes);
    _addCurrentPersonRow(table, config.options, previewMode);
    _addSummaryRow(table, config.options, votesPerOption);

    return toHtml( div );
}

var makeTextInputShowTitle = function(textInput) {
    textInput.val( textInput.attr('title') );
    textInput.addClass( INPLACE_LABEL_CLASS );

    textInput.focus( function() {
        if (textInput.val() == textInput.attr('title')) {
            textInput.val('');
            textInput.removeClass( INPLACE_LABEL_CLASS );
        }
    });

    textInput.blur( function() {
        if (textInput.val() == '') {
            textInput.val( textInput.attr('title') );
            textInput.addClass( INPLACE_LABEL_CLASS );
        }
    });
}

var enableButton = function(selector, enabled) {
    if (enabled) {
        selector.removeAttr('disabled');
    } else {
        selector.attr('disabled', 'disabled');
    }
}

var syncSaveButton = function() {
    var good = ($( '#voterName' ).val().length > 0);
    var saveButton = $( '#submitVote' )
    enableButton(saveButton, good);
}

var onClickCheckBox = function(checkbox) {
    var diff = checkbox.checked ? +1 : -1;
    var sumTdId = checkbox.id.replace( /^option/, 'sum' );
    var sumTd = $( '#pollTable tr td#' + sumTdId );
    var oldSum = parseInt(sumTd.html());
    var newSum = oldSum + diff;

    sumTd.html( newSum );
    if ( oldSum == 0 || newSum == 0 ) {
        if ( newSum == 0 ) {
            sumTd.removeClass( 'sumNonZero' );
        } else {
            sumTd.addClass( 'sumNonZero' );
        }
    }
}

var onChangeVoterName = function(inputElem) {
    // Without delay we still get the old value
    // on access in Chromium.
    setTimeout( syncSaveButton, 1 );
}
