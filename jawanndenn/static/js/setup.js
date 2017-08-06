/* Copyright (C) 2016 Sebastian Pipping <sebastian@pipping.org>
** Licensed under GNU GPL v3 or later
*/
var _REPLACEMENTS_IN_ORDER = [
    ['**', '<strong>', '</strong>'],
    ['*', '<em>', '</em>'],
    ['__', '<strong>', '</strong>'],
    ['_', '<em>', '</em>'],
    ['`', '<tt>', '</tt>'],
];

var _CLOSING_OF = {};
$.each( _REPLACEMENTS_IN_ORDER, function(_, row) {
    var prefix = row[0];
    var closing = row[2];

    _CLOSING_OF[prefix] = closing;
});

var exampleVotesCache = {};

var createExampleVotes = function(config) {
    var exampleVotes = [];
    $.each( config.people, function( i, person ) {
        mail_regex = /^(.*?) <(.*)>$/;
        if ((match = mail_regex.exec(person)) != null) {
            person = match[1];
        }

        var votes = [];
        $.each( config.options, function() {
            votes.push( Math.floor(Math.random() * 3));
        });
        exampleVotes.push( [person, votes] );
    });
    return exampleVotes;
};

var getExampleVotesCached = function(config) {
    return createExampleVotes(config);
}

var exampleConfigJson = JSON.stringify( {
        equal_width: false,
        title: 'Which fruit do *you* like?',
        description: 'A fruit is the **ripened ovary** of a *flowering plant*. You may eat them or not. For a full description, you may search for it.',
        limit_date: new Date(+new Date() + 86400000).toISOString().split('T')[0],
        options: ['Apple', 'Banana', 'Orange', 'Papaya'],
        people: ['Joe <joe@yopmail.com>', 'Lisa <lisa@yopmail.com>', 'Monica <monica@yopmail.com>', 'Astrid <astrid@yopmail.com>']
        }, null, '  ' );

// Excapes HTML and renders subset of markdown
var textToSafeHtml = function(text) {
    // KEEP IN SYNC with python server side!
    text = text
            .replace( /&/g, '&amp;' )
            .replace( /</g, '&lt;' )
            .replace( />/g, '&gt;' );

    var chunks = [];

    var opened = [];
    while (text.length) {
        var matched = false;

        $.each( _REPLACEMENTS_IN_ORDER, function(_, row) {
            var prefix = row[0];
            var opening = row[1];
            var closing = row[2];

            if ( text.startsWith(prefix) ) {
                if (opened.length && opened[opened.length - 1] == prefix) {
                    // Close tag
                    chunks.push( closing );
                    opened.pop();
                } else {
                    // Open tag
                    chunks.push( opening );
                    opened.push( prefix );
                }

                text = text.slice( prefix.length );

                matched = true;
                return false;
            }
        });

        if (! matched) {
            chunks.push( text[0] );
            text = text.slice(1);
        }
    }

    // Close all unclosed tags
    opened.reverse();
    $.each( opened, function(_, prefix) {
        chunks.push( _CLOSING_OF[prefix] );
    });

    return chunks.join('');
};

var processConfig = function(config) {
    return {
        equal_width: !!config.equal_width,
        title: textToSafeHtml( config.title ),
        description: textToSafeHtml( config.description ),
        limit_date: config.limit_date,
        options: $.map( config.options, textToSafeHtml ),
        people: config.people
    };
};

var prevConfigJson = '';
var prevWellformed = null;

var sync = function() {
    var wellformed = true;
    var config = {};
    try {
        config.title = $('#title').val()
        config.description = $('#description').val()
        config.limit_date = new Date($('#limit_date').val()).toISOString().split('T')[0]
        config.options = $('#options').val().split(',')
        config.people = $('#people').val().split(',')
        $('#config').val(JSON.stringify(config));
    } catch( err ) {
        config = null
        wellformed = false;
    }

    if (wellformed != prevWellformed) {
        addRemoveGoodBad( $( ".card-panel" ),
                'wellformed', 'wellformed', 'malformed', wellformed );
        enableButton( $('#createButton'), wellformed );
        prevWellformed = wellformed;
    }

    if (wellformed) {
        var configJsonNormalized = JSON.stringify( config );
        if (configJsonNormalized != prevConfigJson) {
            prevConfigJson = configJsonNormalized;

            config = processConfig( config );

            var poll = $( "#poll" );
            poll.html( createPollHtml( config,
                    getExampleVotesCached( config ),
                    Mode.PREVIEW ) );

            if (config.equal_width) {
                equalizeWidth( poll );
            }
        }
    }
};

$( document ).ready(function() {
    sync();
    setInterval( sync, 500 );
});
