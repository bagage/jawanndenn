/* Copyright (C) 2016 Sebastian Pipping <sebastian@pipping.org>
** Licensed under GNU GPL v3 or later
*/
var VOTED_YES = 1;
var VOTED_NO = 0;
var VOTED_DUNNO = 2;

var VOTED_YES_CLASS = 'votedYes';
var VOTED_NO_CLASS = 'votedNo';
var VOTED_DUNNO_CLASS = 'votedDunno';
var YET_TO_VOTE_CLASS = 'yetToVote';

var _UNICODE_HEAVY_CHECK_MARK = '\u2714';
var _UNICODE_HEAVY_BALLOT_X = '\u2718';
var _UNICODE_BLACK_QUESTION_MARK = '\u2753';

var Mode = {
    PREVIEW: true,
    LIVE: false,
};

// also used by setup.js
var addRemoveGoodBad = function(selector, goodClass, midClass, badClass, choice) {
    if (choice == VOTED_YES) {
        selector.addClass( goodClass );
        selector.removeClass( midClass );
        selector.removeClass( badClass );
    } else if (choice == VOTED_DUNNO) {
        selector.addClass( midClass );
        selector.removeClass( goodClass );
        selector.removeClass( badClass );
    } else {
        selector.addClass( badClass );
        selector.removeClass( midClass );
        selector.removeClass( goodClass );
    }
};

var getQueryVariable = function(variable) {
   var query = window.location.search.substring(1);
   var vars = query.split("&");
   for (var i=0;i<vars.length;i++) {
       var pair = vars[i].split("=");
       if(pair[0] == variable){return pair[1];}
   }
   return(false);
}


var _addHeaderRow = function(table, options) {
    var tr = table.child( tag('tr') );
    tr.child( tag('td') );
    $.each( options, function( i, option ) {
        tr.child( tag('td', {
                class: 'optionLabel'
            }) ).child( option );
    });
    tr.child( tag('td') );
};

var _addExistingVoteRows = function(table, options, votes) {
    var votesPerOption = [];
    $.each( options, function( j, option ) {
        votesPerOption.push( 0 );
    });
    $.each( votes, function( i, personVotes ) {
        var person = personVotes[0];

        var votes = personVotes[1];

        var tr = table.child( tag('tr') );
        tr.child( tag('td', {
                    class: 'person',
                }) ).child( person );
        $.each( options, function( j, option ) {
            var tdClass = 'vote';
            if (votes[j] == VOTED_YES) {
                votesPerOption[j] = (votesPerOption[j] + 1);

                tdClass += ' ' + VOTED_YES_CLASS;
                spanBody = _UNICODE_HEAVY_CHECK_MARK;
            } else if (votes[j] == VOTED_DUNNO) {
                tdClass += ' ' + VOTED_DUNNO_CLASS;
                spanBody = _UNICODE_BLACK_QUESTION_MARK;
            } else {
                tdClass += ' ' + VOTED_NO_CLASS;
                spanBody = _UNICODE_HEAVY_BALLOT_X;
            }
            tr.child( tag('td', {
                        class: tdClass,
                    }) )
                    .child( tag('span') )
                    .child( spanBody );
        });
        tr.child( tag('td', { onclick: 'onClickEdit(event);' }) )
                .child(tag('i', { class: "material-icons"})).child("edit") ;

        tr.child( tag('td') );
    });
    return votesPerOption;
};

var _addCurrentPersonRow = function(table, options, previewMode) {
    var tr = table.child( tag('tr') );
    var voterName = getQueryVariable("voterName") || null
    var inputAttr = {
                id: 'voterName',
                name: 'voterName',
                type: 'text',
                class: 'person',
                placeholder: 'Your name',
            };
    if (voterName != null) {
        inputAttr.value = voterName;
    }
    if (! previewMode) {
        inputAttr.autofocus = 'autofocus';
        // NOTE: onchange fires "too late"
        inputAttr.onkeydown = 'onChangeVoterName(this);';
    }
    tr.child( tag('td', {
                class: 'person'
            }) ).child( tag('input', inputAttr) );

    $.each( options, function( j, option ) {
        var checkbox = tag('input', {
                    type: 'checkbox',
                    id: 'option' + j,
                    name: 'option' + j,
                    onclick: 'onClickCheckBox(this);'
                });
        var td = tr.child( tag('td', {
                id: 'optionTd' + j,
                class: 'vote ' + YET_TO_VOTE_CLASS,
            }));
        td.child( checkbox );
        td.child( tag('label', {
                'for': 'option' + j
                }));
    });
    var input = tag('input', {
                id: 'submitVote',
                type: 'submit',
                class: 'waves-effect waves-light btn',
                value: 'Save',
            })
    if (previewMode || voterName == null) {
        input.attr.disabled = 'disabled'
    }
    var toolsTd = tr.child( tag('td') );
    toolsTd.child(input);
};

var _addSummaryRow = function(table, options, votesPerOption) {
    var tr = table.child( tag('tr') );
    tr.child( tag('td') );
    $.each( options, function( j, option ) {
        var tdAttr = {
                    class: 'vote',
                    id: 'sum' + j,
                };
        if (votesPerOption[j] > 0) {
            tdAttr.class += ' sumNonZero';
        }
        tr.child( tag('td', tdAttr) ).child( votesPerOption[j] );
    });
    tr.child( tag('td') );
};

var formattedDate = function(from_date) {
    var date = new Date(from_date);
    return date.toLocaleDateString(date.getTimezoneOffset(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' } );
}

var createPollHtml = function(config, votes, previewMode) {
    var div = tag('div', {
                class: 'card-panel'
            });
    div.child( tag('h2', {
                class: 'question'
            }) ).child( config.title );
    div.child( tag('h6', {
                class: 'question'
            }) ).child( config.description );
    div.child( tag('p', {
                class: 'question'
            }) ).child( "Date limite d'inscription : " + formattedDate(config.limit_date));
    if (config.people.length) {
        div.child( tag('p', {
                class: 'question'
            }) ).child( "Nombre de participants attendus : " + config.people.length);
    }

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
};

var enableButton = function(selector, enabled) {
    if (enabled) {
        selector.removeAttr('disabled');
    } else {
        selector.attr('disabled', 'disabled');
    }
};

var syncSaveButton = function() {
    var name = $( '#voterName' ).val();
    var good = (name.length > 0)
    var saveButton = $( '#submitVote' );
    enableButton(saveButton, good);
};

var onClickEdit = function(item) {
    var row = $(item.target.parentNode.parentNode);

    // remove previous hidden row, if any
    $(".hidden-row").removeClass();

    // load data
    $('#voterName').val($(row.children('td.person')[0]).html());
    $(row.children('td.vote')).each(function(j, a) {
        var option = $('#option' + j);

        if ($(this).hasClass(VOTED_DUNNO_CLASS)) {
            option.prop('checked', false);
            option.prop('indeterminate', true);
        } else if ($(this).hasClass(VOTED_NO_CLASS)) {
            option.prop('checked', false);
            option.prop('indeterminate', false);
        } else {
            option.prop('checked', true);
            option.prop('indeterminate', false);
        }
        option.prop('readOnly', option.prop('indeterminate'));

        var optionTd = $( '#pollTable tr td#optionTd' + j );
        optionTd.removeClass(YET_TO_VOTE_CLASS);
        addRemoveGoodBad( optionTd, VOTED_YES_CLASS, VOTED_NO_CLASS, VOTED_DUNNO_CLASS,
                option.prop('checked') ? VOTED_YES : option.prop('indeterminate') ? VOTED_NO : VOTED_DUNNO);

    });
    row.addClass( 'hidden-row' );
    syncSaveButton();
}

var onClickCheckBox = function(checkbox) {
    if (checkbox.readOnly) checkbox.checked=checkbox.readOnly=false;
    else if (!checkbox.checked) checkbox.readOnly=checkbox.indeterminate=true;


    var diff = checkbox.checked ? +1 : checkbox.readOnly ? -1 : 0;
    var sumTdId = checkbox.id.replace( /^option/, 'sum' );
    var sumTd = $( '#pollTable tr td#' + sumTdId );
    var oldSum = parseInt(sumTd.html());
    var newSum = oldSum + diff;

    sumTd.html( newSum );
    if ( oldSum === 0 || newSum === 0 ) {
        if ( newSum === 0 ) {
            sumTd.removeClass( 'sumNonZero' );
        } else {
            sumTd.addClass( 'sumNonZero' );
        }
    }

    var optionTdId = checkbox.id.replace( /^option/, 'optionTd' );
    var optionTd = $( '#pollTable tr td#' + optionTdId );
    optionTd.removeClass( YET_TO_VOTE_CLASS );
    addRemoveGoodBad( optionTd, VOTED_YES_CLASS, VOTED_NO_CLASS, VOTED_DUNNO_CLASS,
            checkbox.checked ? VOTED_YES : checkbox.indeterminate ? VOTED_NO : VOTED_DUNNO);
};

var onChangeVoterName = function(inputElem) {
    // Without delay we still get the old value
    // on access in Chromium.
    setTimeout( syncSaveButton, 1 );
};

var createFooterHtml = function() {
    return '\
        <p>\
            <span style="font-size: 150%; position: relative; top: 3px;">&#x2605;</span> \
            <a href="https://github.com/hartwork/jawanndenn/">jawanndenn</a>\
            is <a href="https://www.gnu.org/philosophy/free-sw.en.html">libre software</a>\
            developed by <a href="https://blog.hartwork.org/">Sebastian Pipping</a>,\
            licensed under the <a href="https://www.gnu.org/licenses/agpl.en.html">GNU Affero GPL license</a>.\
            Please <a href="https://github.com/hartwork/jawanndenn/issues">report bugs</a>\
            and let me know\
            if you <a href="mailto:sebastian@pipping.org">like</a> it.\
            <iframe id="github-star-button"\
                    src="https://ghbtns.com/github-btn.html?user=hartwork&amp;repo=jawanndenn&amp;type=star&amp;count=true"\
                    frameborder="0" scrolling="0" width="170px" height="20px" />\
        </p>'
}

var equalizeWidth = function(poll) {
    var optionLabels = $( 'td.optionLabel', poll );
    var optionLabelWidths = optionLabels.map( function() {
        return $(this).width();
    }).get();
    var maxLabelWidth = Math.max.apply(null, optionLabelWidths);
    optionLabels.each( function() {
        var jitter = Math.floor( Math.random() * 3 );
        $(this).width( maxLabelWidth + jitter );
    });
}

$( document ).ready(function() {
    $( 'footer' ).html( createFooterHtml() ).hide();
});
