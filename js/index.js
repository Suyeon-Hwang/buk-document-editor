(function() {
    /* util */
    // debounce
    function debounce(func, wait, immediate) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            var later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    };

    //cookie
    function setCookie(key, value) {
        Cookies.set('buk-document-generator-' + key, value, { expires: 360 });
    }
    function getCookie(key) {
        return Cookies.get('buk-document-generator-' + key);
    }

    /* bukio contents template */
    var CONTENT_TEMPLATE = [
        '<!DOCTYPE html>',
        '<html>',
        '<head>',
        '  <link rel="stylesheet" type="text/css" href="assets/theme/basic/page.css">',
        '  <link id="page-css" rel="stylesheet" type="text/css" href="assets/theme/article/page.css">',
        '  <style id="custom-style"></style>',
        '  <link rel="stylesheet" type="text/css" href="http://d3k696smqaxrrr.cloudfront.net/1.29.75/content.css">',
        '</head>',
        '<body class="bu container comment loaded buk-layout-scroll" theme="light" zoom="100" font="default">',
        '  <div class="bu content comment">',
        '  </div>',
        '  <script src="https://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js"></script>',
        '  <script id="font-load">WebFont.load({google:{families:["Noto+Serif::latin,latin-ext","Open+Sans::latin,latin-ext","Tinos::latin,latin-ext","Roboto::latin,latin-ext"]}});</script>',
        '</body>',
        '</html>'
    ].join('\n');

    /* main */
    var iframe = $('iframe');
    var markdownTextarea = $('.textarea#markdown textarea');
    var styleTextarea = $('.textarea#style textarea');
    var wikiTextarea = $('.textarea#wiki textarea');
    var wikiSearchInput = $('input#wiki');
    var autoUpdate = false;

    // init iframe
    var doc = iframe[0].contentDocument;
    doc.open('text/html');
    doc.write(CONTENT_TEMPLATE);
    doc.close();
    var bucontent = doc.querySelector('.bu.content');
    var customStyle = doc.querySelector('style#custom-style');

    // set value from cookie
    var savedMarkdown = getCookie('markdown');
    var savedStyle = getCookie('style');
    var savedWiki = getCookie('wiki');
    if (savedMarkdown) markdownTextarea.val(savedMarkdown);
    if (savedStyle) styleTextarea.val(savedStyle);
    if (savedWiki) wikiTextarea.val(savedWiki);

    // handle event
    $('button#convert').on('click', function() {
        convert(markdownTextarea.val());
        adjustCustomStyle(styleTextarea.val());
    });

    $('button#wiki').on('click', function() {
        $('.popup#wiki').addClass('active');
    });

    $('button#popup-close').on('click', function() {
        $(this).closest('.popup').removeClass('active');
    });

    $('button#wiki-search').on('click', function() {
        searchWiki(wikiSearchInput.val());
    });

    $('input#auto-update').on('change', function() {
        autoUpdate = $(this).prop('checked');
        convert(markdownTextarea.val());
        adjustCustomStyle(styleTextarea.val());
    });

    $('.tab').on('click', function() {
        $(this).parent().find('.tab').removeClass('active');
        $(this).addClass('active');

        var selected = $(this).attr('tab-id');
        $('.tab-content .textarea').each(function() {
            var self = $(this);
            if (self.attr('id') == selected) {
                self.addClass('active');
            } else {
                self.removeClass('active');
            }
        });
    });

    markdownTextarea.on('keyup', debounce(function() {
        if (autoUpdate) convert(markdownTextarea.val());
        setCookie('markdown', markdownTextarea.val());
    }, 500));

    styleTextarea.on('keyup', debounce(function() {
        if (autoUpdate) adjustCustomStyle(styleTextarea.val());
        setCookie('style', styleTextarea.val());
    }, 500));

    wikiTextarea.on('keyup change', debounce(function() {
        setCookie('wiki', wikiTextarea.val());
    }, 500));

    // functions
    function adjustCustomStyle(cssString) {
        customStyle.innerHTML = cssString;
    }

    function convert(mdString) {
        Kramed(mdString, function(error, outputHtml) {
            bucontent.innerHTML = outputHtml;
        });
    }

    var wikiSearchResult = $('.wiki-result');
    var wikiFrame = $('.popup#wiki iframe');

    window.wikiPreview = function(url) {
        wikiFrame.attr('src', url.replace('ko', 'ko.m'));
    }
    window.wikiSelected = function(url, keyword) {
        wikiTextarea.val(wikiTextarea.val() + (keyword + ', ' + url + '\n'));
        setCookie('wiki', wikiTextarea.val());
        $('.popup#wiki').removeClass('active');
        wikiSearchInput.val('');
        wikiSearchResult[0].innerHTML = '';
    }

    function searchWiki(keyword) {
        $.ajax({
            url: "https://ko.wikipedia.org/w/api.php",
            jsonp: "callback",
            dataType: "jsonp",
            data: {
                action: 'opensearch',
                search: keyword,
                limit: '10',
                suggest: 'true',
                redirects: 'resolve'
            },
            success: function(response) {
                if (response[0] == wikiSearchInput.val()) {
                    var resultsHtml = '';
                    for (i = 0; i < response[1].length; i++) {
                        resultsHtml += '<div>' + response[1][i] + '<button onclick="wikiSelected(\'' + response[3][i].split('/wiki/')[1] + '\', \'' + keyword + '\')">Select</button><button onclick="wikiPreview(\'' + response[3][i] + '\')">Preview</button></div>'
                    }
                    wikiSearchResult[0].innerHTML = resultsHtml;
                }
            }
        });
    }

    $(document).on('keydown', function(e) {
        if (e.key == 'w' && e.ctrlKey) {
            $('.popup#wiki').addClass('active');

            var selection = document.getSelection().toString();
            if (selection.length > 0) {
                wikiSearchInput.val(selection);
                searchWiki(selection);
            }
        } else if (e.key == 'Enter') {
            if (document.activeElement == wikiSearchInput[0]) {
                searchWiki(wikiSearchInput.val());
            }
        }
    });
})();

