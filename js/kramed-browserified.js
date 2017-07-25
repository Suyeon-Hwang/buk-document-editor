(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var kramed = require('kramed');

kramed.setOptions({
	'bfm': true, 
	'breaks': true,
	'headerAutoId': false//,
	//'alternative': true
});

window.Kramed = function(mdString, callback) {
	kramed(mdString, {}, callback);
};
},{"kramed":3}],2:[function(require,module,exports){
module.exports = {
    image: function(block) {
        var args = Array.prototype.slice.call(arguments)
        args.shift();

        if (args.indexOf('scalable') != -1) {
            block = block.replace(/<img /g, '<img bukscalable ');
            args.splice(args.indexOf('scalable'), 1);   
        }

        if (args.indexOf('caption') != -1) {
            return '<div class="image ' + args.join(' ') +'">\n' + block + '</div>\n';
        } else {
            if (args.length > 0) {
                return block.replace('<p', '<p class="image ' + args.join(' ') + '"');
            } else {
                return block.replace('<p', '<p class="image"');
            }
        }
    },

    signature: function(block) {
        var args = Array.prototype.slice.call(arguments)
        args.shift();

        if (args.length > 0) {
            return '<div class="signature ' + args.join(' ') +'">\n' + block + '</div>\n';
        } else {
            return '<div class="signature">\n' + block + '</div>\n';
        }
    }
}
},{}],3:[function(require,module,exports){
/**
 * kramed - a markdown parser
 * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/GitbookIO/kramed
 */
/**
 * kramed - a kramdown parser, based off chjj's kramed
 * Copyright (c) 2014, Aaron O'Mullan. (MIT Licensed)
 * https://github.com/GitbookIO/kramed
*/

var _utils = require('./utils');
var merge = _utils.merge;

var Lexer = require('./lex/block');
var InlineLexer = require('./lex/inline');

var Parser = require('./parser');
var Renderer = require('./renderer');

/**
 * Kramed
 */

function kramed(src, opt, callback) {
  if (callback || typeof opt === 'function') {
    if (!callback) {
      callback = opt;
      opt = null;
    }

    opt = merge({}, kramed.defaults, opt || {});

    var highlight = opt.highlight
      , tokens
      , pending
      , i = 0;

    try {
      tokens = Lexer.lex(src, opt)
    } catch (e) {
      return callback(e);
    }

    pending = tokens.length;

    var done = function(err) {
      if (err) {
        opt.highlight = highlight;
        return callback(err);
      }

      var out;

      try {
        out = Parser.parse(tokens, opt);
      } catch (e) {
        err = e;
      }

      opt.highlight = highlight;

      return err
        ? callback(err)
        : callback(null, out);
    };

    if (!highlight || highlight.length < 3) {
      return done();
    }

    delete opt.highlight;

    if (!pending) return done();

    for (; i < tokens.length; i++) {
      (function(token) {
        if (token.type !== 'code') {
          return --pending || done();
        }
        return highlight(token.text, token.lang, function(err, code) {
          if (err) return done(err);
          if (code == null || code === token.text) {
            return --pending || done();
          }
          token.text = code;
          token.escaped = true;
          --pending || done();
        });
      })(tokens[i]);
    }

    return;
  }
  try {
    if (opt) opt = merge({}, kramed.defaults, opt);
    return Parser.parse(Lexer.lex(src, opt), opt);
  } catch (e) {
    e.message += '\nPlease report this to https://github.com/GitbookIO/kramed.';
    if ((opt || kramed.defaults).silent) {
      return '<p>An error occured:</p><pre>'
        + escape(e.message + '', true)
        + '</pre>';
    }
    throw e;
  }
}

/**
 * Options
 */

kramed.options =
kramed.setOptions = function(opt) {
  merge(kramed.defaults, opt);
  return kramed;
};

kramed.defaults = {
  // Lexer options (both block and inline lexers)
  bfm: false, // buk flavored markdown
  alternative: false, // buk flavored markdown
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: false,
  mathjax: true,

  // Kramed options
  silent: false,
  highlight: null,

  // Renderer options
  langPrefix: 'lang-',
  smartypants: false,
  headerPrefix: '',
  headerAutoId: true,
  xhtml: false,
  targetBlank: false,

  // Default rendrer passed to Parser
  // renderer: new Renderer, // commented for accepting options
};

/**
 * Expose
 */

kramed.Parser = Parser;
kramed.parser = Parser.parse;

kramed.Renderer = Renderer;

kramed.Lexer = Lexer;
kramed.lexer = Lexer.lex;

kramed.InlineLexer = InlineLexer;
kramed.inlineLexer = InlineLexer.output;

kramed.parse = kramed;

module.exports = kramed;

},{"./lex/block":4,"./lex/inline":6,"./parser":8,"./renderer":9,"./utils":12}],4:[function(require,module,exports){
var _utils = require('../utils');
var noop = _utils.noop;

var block = require('../rules/block');
var defaultOptions = require('./options');

/**
 * Block Lexer
 */

function Lexer(options) {
  this.tokens = [];
  this.tokens.links = {};
  this.options = options || defaultOptions;
  this.rules = block.normal;

  if (this.options.bfm) {
    this.rules = block.bfm;
  } else if (this.options.gfm) {
    if (this.options.tables) {
      this.rules = block.tables;
    } else {
      this.rules = block.gfm;
    }
  }

  // Is mathjax disabled ?
  if (!this.options.mathjax) {
    this.rules.math = noop;
  }
}

/**
 * Expose Block Rules
 */

Lexer.rules = block;

/**
 * Static Lex Method
 */

Lexer.lex = function(src, options) {
  var lexer = new Lexer(options);
  return lexer.lex(src);
};

/**
 * Preprocessing
 */

Lexer.prototype.lex = function(src) {
  src = src
    .replace(/\r\n|\r/g, '\n')
    .replace(/\t/g, '    ')
    .replace(/\u00a0/g, ' ')
    .replace(/\u2424/g, '\n');

  return this.token(src, true);
};

/**
 * Lexing
 */

Lexer.prototype.token = function(src, top, bq) {
  var src = src.replace(/^ +$/gm, '')
    , next
    , loose
    , cap
    , bull
    , b
    , item
    , space
    , i
    , l;

  while (src) {

    // section (bfm)
    if (top && (cap = this.rules.section.exec(src))) {
      src = src.substring(cap[0].length);
      
      this.tokens.push({
        type: 'section_divider'
      });

      continue;
    }

    // newline
    if (cap = this.rules.newline.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[0].length > 1) {
        this.tokens.push({
          type: 'space'
        });
      }
    }

    // code
    if (cap = this.rules.code.exec(src)) {
      src = src.substring(cap[0].length);
      cap = cap[0].replace(/^ {4}/gm, '');
      this.tokens.push({
        type: 'code',
        text: !this.options.pedantic
          ? cap.replace(/\n+$/, '')
          : cap
      });
      continue;
    }

    // // fences (gfm)
    // if (cap = this.rules.fences.exec(src)) {
    //   src = src.substring(cap[0].length);
    //   this.tokens.push({
    //     type: 'code',
    //     lang: cap[2],
    //     text: cap[3]
    //   });
    //   continue;
    // }

    // footnote
    if (cap = this.rules.footnote.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'footnote',
        refname: cap[1],
        text: cap[2]
      });
      continue;
    }

    // math
    if (cap = this.rules.math.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'math',
        text: cap[2]
      });
      continue;
    }

    // heading
    if (cap = this.rules.heading.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'heading',
        depth: cap[1].length,
        text: cap[2]
      });
      continue;
    }

    // table no leading pipe (gfm)
    if (top && (cap = this.rules.nptable.exec(src))) {
      src = src.substring(cap[0].length);

      item = {
        type: 'table',
        header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
        align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
        cells: cap[3].replace(/\n$/, '').split('\n')
      };

      for (i = 0; i < item.align.length; i++) {
        if (/^ *-+: *$/.test(item.align[i])) {
          item.align[i] = 'right';
        } else if (/^ *:-+: *$/.test(item.align[i])) {
          item.align[i] = 'center';
        } else if (/^ *:-+ *$/.test(item.align[i])) {
          item.align[i] = 'left';
        } else {
          item.align[i] = null;
        }
      }

      for (i = 0; i < item.cells.length; i++) {
        item.cells[i] = item.cells[i].split(/ *\| */);
      }

      this.tokens.push(item);

      continue;
    }

    // lheading
    if (cap = this.rules.lheading.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'heading',
        depth: cap[2] === '=' ? 1 : 2,
        text: cap[1]
      });
      continue;
    }

    // hr
    if (cap = this.rules.hr.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'hr'
      });
      continue;
    }

    // fences (gfm)
    if (cap = this.rules.fences.exec(src)) {
      src = src.substring(cap[0].length);

      this.tokens.push({
        type: 'bukCode_start',
        className: cap[2]
      });

      cap = cap[3];

      this.token(cap, top, bq);

      this.tokens.push({
        type: 'bukCode_end'
      });

      continue;
    }

    // buk block (bfm)
    if (cap = this.rules.bukBlock.exec(src)) {
      src = src.substring(cap[0].length);

      this.tokens.push({
        type: 'bukBlock_start',
        formatter: cap[1] 
      });

      cap = cap[2];

      this.token(cap, top, bq);

      this.tokens.push({
        type: 'bukBlock_end'
      });

      continue;
    }

    // blockquote
    if (cap = this.rules.blockquote.exec(src)) {
      src = src.substring(cap[0].length);

      this.tokens.push({
        type: 'blockquote_start'
      });

      cap = cap[0].replace(/^ *> ?/gm, '');

      // Pass `top` to keep the current
      // "toplevel" state. This is exactly
      // how markdown.pl works.
      this.token(cap, top, true);

      this.tokens.push({
        type: 'blockquote_end'
      });

      continue;
    }

    // list
    if (cap = this.rules.list.exec(src)) {
      src = src.substring(cap[0].length);
      bull = cap[2];

      this.tokens.push({
        type: 'list_start',
        ordered: bull.length > 1
      });

      // Get each top-level item.
      cap = cap[0].match(this.rules._item);

      next = false;
      l = cap.length;
      i = 0;

      for (; i < l; i++) {
        item = cap[i];

        // Remove the list item's bullet
        // so it is seen as the next token.
        space = item.length;
        item = item.replace(/^ *([*+-]|\d+\.) +/, '');

        // Outdent whatever the
        // list item contains. Hacky.
        if (~item.indexOf('\n ')) {
          space -= item.length;
          item = !this.options.pedantic
            ? item.replace(new RegExp('^ {1,' + space + '}', 'gm'), '')
            : item.replace(/^ {1,4}/gm, '');
        }

        // Determine whether the next list item belongs here.
        // Backpedal if it does not belong in this list.
        if (this.options.smartLists && i !== l - 1) {
          b = block._bullet.exec(cap[i + 1])[0];
          if (bull !== b && !(bull.length > 1 && b.length > 1)) {
            src = cap.slice(i + 1).join('\n') + src;
            i = l - 1;
          }
        }

        // Determine whether item is loose or not.
        // Use: /(^|\n)(?! )[^\n]+\n\n(?!\s*$)/
        // for discount behavior.
        loose = next || /\n\n(?!\s*$)/.test(item);
        if (i !== l - 1) {
          next = item.charAt(item.length - 1) === '\n';
          if (!loose) loose = next;
        }

        this.tokens.push({
          type: loose
            ? 'loose_item_start'
            : 'list_item_start'
        });

        // Recurse.
        this.token(item, false, bq);

        this.tokens.push({
          type: 'list_item_end'
        });
      }

      this.tokens.push({
        type: 'list_end'
      });

      continue;
    }

    // html
    if (cap = this.rules.html.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: this.options.sanitize
          ? 'paragraph'
          : 'html',
        pre: cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style',
        text: cap[0]
      });
      continue;
    }

    // def
    if ((!bq && top) && (cap = this.rules.def.exec(src))) {
      src = src.substring(cap[0].length);

      this.tokens.links[cap[1].toLowerCase()] = {
        href: cap[2],
        title: cap[3],
        // id: cap[4],
      };
      continue;
    }

    // table (gfm)
    if (top && (cap = this.rules.table.exec(src))) {
      src = src.substring(cap[0].length);

      item = {
        type: 'table',
        header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
        align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
        cells: cap[3].replace(/(?: *\| *)?\n$/, '').split('\n').slice(0),
      };

      for (i = 0; i < item.align.length; i++) {
        if (/^ *-+: *$/.test(item.align[i])) {
          item.align[i] = 'right';
        } else if (/^ *:-+: *$/.test(item.align[i])) {
          item.align[i] = 'center';
        } else if (/^ *:-+ *$/.test(item.align[i])) {
          item.align[i] = 'left';
        } else {
          item.align[i] = null;
        }
      }

      for (i = 0; i < item.cells.length; i++) {
        item.cells[i] = item.cells[i]
          .replace(/^ *\| *| *\| *$/g, '')
          .split(/ *\| */);
      }

      this.tokens.push(item);

      continue;
    }

    // headerless table
    if (top && (cap = this.rules.headerlessTable.exec(src))) {
      src = src.substring(cap[0].length);

      item = {
        type: 'headerless_table',
        cells: cap[1].replace(/(?: *\| *)?\n$/, '').split('\n').slice(0),
      };

      for (i = 0; i < item.cells.length; i++) {
        item.cells[i] = item.cells[i]
          .replace(/^ *\| *| *\| *$/g, '')
          .split(/ *\| */);
      }

      this.tokens.push(item);

      continue;
    }

    // top-level paragraph
    if (top && (cap = this.rules.paragraph.exec(src))) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'paragraph',
        text: cap[1].charAt(cap[1].length - 1) === '\n'
          ? cap[1].slice(0, -1)
          : cap[1]
      });
      continue;
    }

    // text
    if (cap = this.rules.text.exec(src)) {
      // Top-level should never reach here.
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'text',
        text: cap[0]
      });
      continue;
    }

    if (src) {
      throw new
        Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }
  }

  return this.tokens;
};

module.exports = Lexer;

},{"../rules/block":10,"../utils":12,"./options":7}],5:[function(require,module,exports){
// List of valid html blocks names, accorting to commonmark spec
// http://jgm.github.io/CommonMark/spec.html#html-blocks

'use strict';

// Treat these blocks as RAW HTML
var htmlBlocks = [
  'address',
  'article',
  'aside',
  'base',
  'basefont',
  'blockquote',
  'body',
  'caption',
  'center',
  'col',
  'colgroup',
  'dd',
  'details',
  'dialog',
  'dir',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'frame',
  'frameset',
  'h1',
  'head',
  'header',
  'hr',
  'html',
  'iframe',
  'legend',
  'li',
  'link',
  'main',
  'menu',
  'menuitem',
  'meta',
  'nav',
  'noframes',
  'ol',
  'optgroup',
  'option',
  'p',
  'param',
  'pre',
  'script',
  'section',
  'source',
  'title',
  'summary',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'title',
  'tr',
  'track',
  'ul'
];

var blockMap = htmlBlocks.reduce(function(accu, x) {
  accu[x] = true;
  return accu;
}, {});

function isBlock(tag) {
  if(!tag) {
    return false;
  } 
  var key = tag.toLowerCase();
  return Boolean(blockMap[key]);
}

module.exports = isBlock;

},{}],6:[function(require,module,exports){
var _utils = require('../utils');
var escape = _utils.escape;
var noop = _utils.noop;

var inline = require('../rules/inline');
var Renderer = require('../renderer');
var defaultOptions = require('./options');
var isHTMLBlock =  require('./html_blocks');

/**
 * Inline Lexer & Compiler
 */

function InlineLexer(links, options, renderer) {
  this.options = options || defaultOptions;
  this.links = links;
  this.rules = inline.normal;
  this.renderer = renderer

  if (!this.links) {
    throw new
      Error('Tokens array requires a `links` property.');
  }

  if (this.options.bfm) {
    this.rules = inline.bfm;
    if (!this.options.alternative) {
      this.rules.alternative = noop;
    }
  } else if (this.options.gfm) {
    if (this.options.breaks) {
      this.rules = inline.breaks;
    } else {
      this.rules = inline.gfm;
    }
  } else if (this.options.pedantic) {
    this.rules = inline.pedantic;
  }

  // Is mathjax disabled ?
  if (!this.options.mathjax) {
     this.rules.math = noop;
  }
}

/**
 * Expose Inline Rules
 */

InlineLexer.rules = inline;

/**
 * Static Lexing/Compiling Method
 */

InlineLexer.output = function(src, links, options) {
  var inline = new InlineLexer(links, options, new Renderer());
  return inline.output(src);
};

InlineLexer.prototype.escape = function(html, encode) {
  // Handle escaping being turned off
  if(this.options && this.options.escape === false) {
    return html;
  }
  return escape(html, encode);
};

/**
 * Lexing/Compiling
 */

InlineLexer.prototype.output = function(src) {
  var out = ''
    , link
    , text
    , href
    , cap
    , alt;

  while (src) {
    // escape
    if (cap = this.rules.escape.exec(src)) {
      src = src.substring(cap[0].length);
      out += cap[1];
      continue;
    }

    // autolink
    if (cap = this.rules.autolink.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[2] === '@') {
        text = cap[1].charAt(6) === ':'
          ? this.mangle(cap[1].substring(7))
          : this.mangle(cap[1]);
        href = this.mangle('mailto:') + text;
      } else {
        text = this.escape(cap[1]);
        href = text;
      }
      // out += this.renderer.link(href, null, text);
      out += this.renderer.link(href, null, null, text);
      continue;
    }

    // url (gfm)
    if (!this.inLink && (cap = this.rules.url.exec(src))) {
      src = src.substring(cap[0].length);
      text = this.escape(cap[1]);
      href = text;
      // out += this.renderer.link(href, null, text);
      out += this.renderer.link(href, null, null, text);
      continue;
    }

    // html
    if (cap = this.rules.html.exec(src)) {
      // Found a link
      if(cap[1] === 'a' && cap[2] && !this.inLink) {
        // Opening tag
        out += cap[0].substring(0, cap[0].indexOf(cap[2]));
        this.inLink = true;
        // In between the tag
        out += this.output(cap[2]);
        this.inLink = false;
        // Outer tag
        out += cap[0].substring(cap[0].indexOf(cap[2])+cap[2].length);
        // Advance parser
        src = src.substring(cap[0].length);
        continue;
      }

      // Found HTML that we should parse
      if(cap[1] && !isHTMLBlock(cap[1]) && cap[2]) {
        // Opening tag
        out += cap[0].substring(0, cap[0].indexOf(cap[2]));
        // In between the tag
        out += this.output(cap[2]);
        // Outer tag
        out += cap[0].substring(cap[0].indexOf(cap[2])+cap[2].length);
        // Advance parser
        src = src.substring(cap[0].length);
        continue;
      }

      // Any other HTML
      src = src.substring(cap[0].length);
      out += cap[0];
      continue;
    }

    // link
    if (cap = this.rules.link.exec(src)) {
      src = src.substring(cap[0].length);
      this.inLink = true;

      out += this.outputLink(cap, {
        href: cap[2],
        title: cap[3],
        // id: cap[4],
        // type: cap[5]
      });
      this.inLink = false;
      continue;
    }

    // bfm: bukLink
    if ((cap = this.rules.bukLink.exec(src))) {
        src = src.substring(cap[0].length);

        this.inLink = true;
        out += this.outputBukLink({
          id: cap[1],
          formatter: cap[2],
          href: cap[3],
          text: cap[4]
        });
        // out += this.renderer.bukLink(cap[1], cap[2], cap[3], cap[4]);
        this.inLink = false;
        continue;
    }

    // bfm: idspan
    if ((cap = this.rules.idspan.exec(src))) {
        src = src.substring(cap[0].length);
        out += this.renderer.idspan(cap[1], cap[2]);
        continue;
    }

    // reffn
    if ((cap = this.rules.reffn.exec(src))) {
        src = src.substring(cap[0].length);
        out += this.renderer.reffn(cap[1]);
        continue;
    }

    // reflink, nolink
    if ((cap = this.rules.reflink.exec(src))
        || (cap = this.rules.nolink.exec(src))) {
      src = src.substring(cap[0].length);
      link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
      link = this.links[link.toLowerCase()];
      if (!link || !link.href) {
        if (!link && this.rules.alternative.exec(cap[0])) {
          alt = this.rules.alternative.exec(cap[0])[0];
          out += this.renderer.alternative(alt.substring(1, alt.length - 1));
          src = cap[0].substring(alt.length) + src;
        } else {
          out += cap[0].charAt(0);
          src = cap[0].substring(1) + src;
        }
        continue;
      }
      // //bfm
      // link.type = cap[2] ? cap[3] : cap[2];
      // //----
      this.inLink = true;
      out += this.outputLink(cap, link);
      this.inLink = false;
      continue;
    } 

    // strong
    if (cap = this.rules.strong.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.strong(this.output(cap[2] || cap[1]));
      continue;
    }

    // em
    if (cap = this.rules.em.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.em(this.output(cap[2] || cap[1]));
      continue;
    }

    // code
    if (cap = this.rules.code.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.codespan(this.escape(cap[2], true));
      continue;
    }

    // math
    if (cap = this.rules.math.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.math(cap[1], 'math/tex', false); //FIXME: filter <script> & </script>
      continue;
    }

    // br
    if (cap = this.rules.br.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.br();
      continue;
    }

    // del (gfm)
    if (cap = this.rules.del.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.del(this.output(cap[1]));
      continue;
    }

    // text
    if (cap = this.rules.text.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.escape(this.smartypants(cap[0]));
      continue;
    }

    if (src) {
      throw new
        Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }
  }

  return out;
};

/**
 * Compile Link
 */

InlineLexer.prototype.outputLink = function(cap, link) {
  var href = this.escape(link.href)
    , title = link.title ? this.escape(link.title) : null;

  return cap[0].charAt(0) !== '!'
    ? this.renderer.link(href, title, this.output(cap[1]))
    : this.renderer.image(href, title, this.escape(cap[1]));
};

InlineLexer.prototype.outputBukLink = function(link) {
  return this.renderer.bukLink(link.id, link.formatter, this.escape(link.href), this.output(link.text));
};

/**
 * Smartypants Transformations
 */

InlineLexer.prototype.smartypants = function(text) {
  if (!this.options.smartypants) return text;
  return text
    // em-dashes
    .replace(/--/g, '\u2014')
    // opening singles
    .replace(/(^|[-\u2014/(\[{"\s])'/g, '$1\u2018')
    // closing singles & apostrophes
    .replace(/'/g, '\u2019')
    // opening doubles
    .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, '$1\u201c')
    // closing doubles
    .replace(/"/g, '\u201d')
    // ellipses
    .replace(/\.{3}/g, '\u2026');
};

/**
 * Mangle Links
 */

InlineLexer.prototype.mangle = function(text) {
  var out = ''
    , l = text.length
    , i = 0
    , ch;

  for (; i < l; i++) {
    ch = text.charCodeAt(i);
    if (Math.random() > 0.5) {
      ch = 'x' + ch.toString(16);
    }
    out += '&#' + ch + ';';
  }

  return out;
};

module.exports = InlineLexer;

},{"../renderer":9,"../rules/inline":11,"../utils":12,"./html_blocks":5,"./options":7}],7:[function(require,module,exports){
module.exports = {
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: false,
  mathjax: true,
};

},{}],8:[function(require,module,exports){
var Renderer = require('./renderer');
var InlineLexer = require('./lex/inline');

/**
 * Parsing & Compiling
 */

function Parser(options, renderer) {
  this.tokens = [];
  this.token = null;
  this.options = options ? options : null;
  this.renderer = renderer || (this.options && this.options.renderer) || new Renderer(this.options);
}

/**
 * Static Parse Method
 */

Parser.parse = function(src, options, renderer) {
  var parser = new Parser(options, renderer);
  return parser.parse(src);
};

/**
 * Parse Loop
 */

Parser.prototype.parse = function(src) {
  this.inline = new InlineLexer(src.links, this.options, this.renderer);
  this.tokens = src.reverse();

  var out = '';
  while (this.next()) {
    out += this.tok();
  }

  return out;
};

/**
 * Next Token
 */

Parser.prototype.next = function() {
  return this.token = this.tokens.pop();
};

/**
 * Preview Next Token
 */

Parser.prototype.peek = function() {
  return this.tokens[this.tokens.length - 1] || 0;
};

/**
 * Parse Text Tokens
 */

Parser.prototype.parseText = function() {
  var body = this.token.text;

  while (this.peek().type === 'text') {
    body += '\n' + this.next().text;
  }

  return this.inline.output(body);
};

/**
 * Parse Current Token
 */

Parser.prototype.tok = function() {
  if(typeof this.token === 'undefined' || !this.token.hasOwnProperty('type')) {
      return '';
  }
  switch (this.token.type) {
    case 'space': {
      return '';
    }
    case 'hr': {
      return this.renderer.hr();
    }
    case 'heading': {
      return this.renderer.heading(
        this.inline.output(this.token.text),
        this.token.depth,
        this.token.text);
    }
    case 'footnote': {
      return this.renderer.footnote(
        this.token.refname,
        this.inline.output(this.token.text));
    }
    case 'code': {
      return this.renderer.code(this.token.text,
        this.token.lang,
        this.token.escaped);
    }
    case 'math': {
      return this.renderer.math(this.token.text, 'math/tex', true);
    }
    case 'table': {
      var header = ''
        , body = ''
        , i
        , row
        , cell
        , flags
        , j;

      // header
      cell = '';
      for (i = 0; i < this.token.header.length; i++) {
        flags = { header: true, align: this.token.align[i] };
        cell += this.renderer.tablecell(
          this.inline.output(this.token.header[i]),
          { header: true, align: this.token.align[i] }
        );
      }
      header += this.renderer.tablerow(cell);

      for (i = 0; i < this.token.cells.length; i++) {
        row = this.token.cells[i];

        cell = '';
        for (j = 0; j < row.length; j++) {
          cell += this.renderer.tablecell(
            this.inline.output(row[j]),
            { header: false, align: this.token.align[j] }
          );
        }

        body += this.renderer.tablerow(cell);
      }
      return this.renderer.table(header, body);
    }
    case 'blockquote_start': {
      var body = '';

      while (this.next().type !== 'blockquote_end') {
        body += this.tok();
      }

      return this.renderer.blockquote(body);
    }
    case 'list_start': {
      var body = ''
        , ordered = this.token.ordered;

      while (this.next().type !== 'list_end') {
        body += this.tok();
      }

      return this.renderer.list(body, ordered);
    }
    case 'list_item_start': {
      var body = '';

      while (this.next().type !== 'list_item_end') {
        body += this.token.type === 'text'
          ? this.parseText()
          : this.tok();
      }

      return this.renderer.listitem(body);
    }
    case 'loose_item_start': {
      var body = '';

      while (this.next().type !== 'list_item_end') {
        body += this.tok();
      }

      return this.renderer.listitem(body);
    }
    case 'html': {
      return this.renderer.html(this.token.text);
    }
    case 'paragraph': {
      return this.renderer.paragraph(this.inline.output(this.token.text));
    }
    case 'text': {
      return this.renderer.paragraph(this.parseText());
    }
    /* buk flavored markdown */
    case 'section_divider': {
      return this.renderer.sectiondivider();
    }
    case 'bukBlock_start': {
      var body = '';
      var formatter = this.token.formatter;

      while (this.next().type !== 'bukBlock_end') {
        body += this.tok();
      }

      return this.renderer.bukBlock(body, formatter);
    }
    case 'bukCode_start': {
      var body = '';
      var formatter = this.token.className;

      while (this.next().type !== 'bukCode_end') {
        body += this.tok();
      }

      return this.renderer.bukCode(body, formatter);
    }
    case 'headerless_table': {
      var header = ''
        , body = ''
        , i
        , row
        , cell
        , flags
        , j;

      for (i = 0; i < this.token.cells.length; i++) {
        row = this.token.cells[i];

        cell = '';
        for (j = 0; j < row.length; j++) {
          cell += this.renderer.tablecell(
            this.inline.output(row[j]),
            { header: false }
          );
        }

        body += this.renderer.tablerow(cell);
      }
      return this.renderer.headerlessTable(body);
    }
  }
};

module.exports = Parser;

},{"./lex/inline":6,"./renderer":9}],9:[function(require,module,exports){
var _utils = require('./utils');
var escape = _utils.escape;
var unescape = _utils.unescape;
var formatters = require('./formatters');

/**
 * Renderer
 */

var defaultOptions = {
  langPrefix: 'lang-',
  smartypants: false,
  headerPrefix: '',
  headerAutoId: true,
  xhtml: false,
};

function Renderer(options) {
  this.options = options || defaultOptions;
}

Renderer.prototype.code = function(code, lang, escaped) {
  if (this.options.highlight) {
    var out = this.options.highlight(code, lang);
    if (out != null && out !== code) {
      escaped = true;
      code = out;
    }
  }

  if (!lang) {
    return '<pre><code>'
      + (escaped ? code : escape(code, true))
      + '\n</code></pre>';
  }

  return '<pre><code class="'
    + this.options.langPrefix
    + escape(lang, true)
    + '">'
    + (escaped ? code : escape(code, true))
    + '\n</code></pre>\n';
};

Renderer.prototype.blockquote = function(quote) {
  return '<blockquote>\n' + quote + '</blockquote>\n';
};

Renderer.prototype.html = function(html) {
  return html;
};

Renderer.prototype._createId = function(str) {
  // replace " " and all punctuation characters to "-"
  str = str.toLowerCase().replace(/[\s\]\[\!\"\#\$\%\&\'\(\)\*\+\,\.\/\:\;\<\=\>\?\@\\\^\_\`\{\|\}\~\-]+/g, '-');
  try {
    str = encodeURIComponent(str);
  } catch (e) {
    str = str.replace(/[^\w]+/g, '-');
  }
  return str.replace(/-$/, '');
};

Renderer.prototype.heading = function(text, level, raw) {
  var id = /({#)(.+)(})/g.exec(raw);
  id = id? id[2] : null;

  if (!id && this.options.headerAutoId !== false) id = this._createId(raw)

  return '<h'
    + level
    + (id? ' id="' + id + '"' : '')
    + '>'
    + text.replace(/{#.+}/g, '')
    + '</h'
    + level
    + '>\n';
};

Renderer.prototype.hr = function() {
  return this.options.xhtml ? '<hr/>\n' : '<hr>\n';
};

Renderer.prototype.list = function(body, ordered) {
  var type = ordered ? 'ol' : 'ul';
  return '<' + type + '>\n' + body + '</' + type + '>\n';
};

Renderer.prototype.listitem = function(text) {
  return '<li>' + text + '</li>\n';
};

Renderer.prototype.paragraph = function(text) {
  // BFM - class attribute

  // var pClass = /^\{([^\}]+)\:\}/.exec(text);
  // pClass = this.options.bfm && pClass ? pClass[1] : null;

  return '<p' 
    // + (pClass ? (' class="' + pClass + '"') : '') 
    + '>' 
    // + (pClass ? text.replace(/^\{([^\}]+)\:\}/g, '') : text)
    + text
    + '</p>\n';
};

Renderer.prototype.table = function(header, body) {
  return '<table>\n'
    + '<thead>\n'
    + header
    + '</thead>\n'
    + '<tbody>\n'
    + body
    + '</tbody>\n'
    + '</table>\n';
};

Renderer.prototype.tablerow = function(content) {
  return '<tr>\n' + content + '</tr>\n';
};

Renderer.prototype.tablecell = function(content, flags) {
  var type = flags.header ? 'th' : 'td';
  var tag = flags.align
    ? '<' + type + ' style="text-align:' + flags.align + '">'
    : '<' + type + '>';
  return tag + content + '</' + type + '>\n';
};

Renderer.prototype.math = function(content, language, display) {
  mode = display ? '; mode=display' : '';
  return '<script type="' + language + mode + '">' + content + '</script>';
}

// span level renderer
Renderer.prototype.strong = function(text) {
  return '<strong>' + text + '</strong>';
};

Renderer.prototype.em = function(text) {
  return '<em>' + text + '</em>';
};

Renderer.prototype.codespan = function(text) {
  return '<code>' + text + '</code>';
};

Renderer.prototype.br = function() {
  return this.options.xhtml ? '<br/>' : '<br>';
};

Renderer.prototype.del = function(text) {
  return '<del>' + text + '</del>';
};

Renderer.prototype.reffn = function(refname) {
  return '<sup><a href="#fn_' + refname + '" id="reffn_' + refname + '">' + refname + '</a></sup>'
}

// Renderer.prototype.footnote = function(refname, text) {
//   return '<blockquote id="fn_' + refname + '">\n'
//     + '<sup>' + refname + '</sup>. '
//     + text
//     + '<a href="#reffn_' + refname + '" title="Jump back to footnote [' + refname + '] in the text."> &#8617;</a>\n'
//     + '</blockquote>\n';
// }

Renderer.prototype.footnote = function(refname, text) {
  return '<blockquote id="fn_' + refname + '">\n'
    + '<sup><a href="#reffn_' + refname + '" title="Jump back to footnote [' + refname + '] in the text.">' + refname + '</a></sup> '
    + text
    + '\n</blockquote>\n';
}


Renderer.prototype.link = function(href, title, text) {
  if (this.options.sanitize) {
    try {
      var prot = decodeURIComponent(unescape(href))
        .replace(/[^\w:]/g, '')
        .toLowerCase();
    } catch (e) {
      return '';
    }
    if (prot.indexOf('javascript:') === 0) {
      return '';
    }
  }

  // BFM - id attribute

  var out = '<a href="' + href + '"';
  if (title) {
    out += ' title="' + title + '"';
  }
  if (this.options.targetBlank) {
    out += ' target="_blank"';
  }
  // if (id && this.options.bfm) {
  //   out += ' id="' + id + '"';
  // }
  out += '>' + text + '</a>';
  return out;
};

Renderer.prototype.image = function(href, title, text) {
  var out = '<img src="' + href + '" alt="' + text + '"';
  if (title) {
    out += ' title="' + title + '"';
  }
  // if (id && this.options.bfm) {
  //   out += ' id="' + id + '"';
  // }
  // if (type && this.options.bfm) {
  //   out += ' class="' + type + '"';
  // }
  out += this.options.xhtml ? '/>' : '>';
  return out;
};

/* buk flavored markdown */
Renderer.prototype.sectiondivider = function() {
  return '<div class="section-divider"></div>\n';
};

Renderer.prototype.bukLink = function(id, formatter, href, text) {
  var out = '<a href="' + href + '"';
  if (id) {
    out += ' id="' + id + '"';
  }
  out += '>' + text + '</a>';
  return out;
}

Renderer.prototype.bukBlock = function(block, formatter){
  var name, param;

  if (formatter) {
    name = /([^\(\)]+)(?:\(([^\)]*)\))?/.exec(formatter)[1];
    param = /([^\(\)]+)(?:\(([^\)]*)\))?/.exec(formatter)[2];
  } else {
    name = 'quote';
  }

  if (formatters.hasOwnProperty(name)) {
    if (param && param.length) {
      var params = param.split(',');
      for (var i = 0; i < params.length; i++) {
        params[i] = params[i].trim();
      }
      params.unshift(block);
      return formatters[name].apply(null, params);
    } else {
      return formatters[name](block);
    }
  }

  var className = name;
  if (param && param.length) {
    param = param.split(',');
    for (var i = 0; i < param.length; i++) {
      className += ' ' + param[i].trim();
    }
  }

  return '<div class="' + className + '">\n' + block + '</div>\n';
};

Renderer.prototype.idspan = function(id, text) {
  return '<span id="' + id + '">' + text + '</span>';
};

Renderer.prototype.bukCode = function(block, formatter){
  var name, param;

  if (formatter) {
    name = /([^\(\)]+)(?:\(([^\)]*)\))?/.exec(formatter)[1];
    param = /([^\(\)]+)(?:\(([^\)]*)\))?/.exec(formatter)[2];
  }

  if (name && formatters.hasOwnProperty(name)) {
    if (param && param.length) {
      var params = param.split(',');
      for (var i = 0; i < params.length; i++) {
        params[i] = params[i].trim();
      }
      params.unshift(block);
      return formatters[name].apply(null, params);
    } else {
      return formatters[name](block);
    }
  }

  var className = name;
  if (param && param.length) {
    param = param.split(',');
    for (var i = 0; i < param.length; i++) {
      className += ' ' + param[i].trim();
    }
  }

  return '<div' + (name ? (' class="' + className) + '"' : '') + '>\n' + block + '</div>\n';
};

Renderer.prototype.headerlessTable = function(body) {
  return '<table>\n'
    + '<tbody>\n'
    + body
    + '</tbody>\n'
    + '</table>\n';
};

Renderer.prototype.alternative = function(text) {
  return '<span class="alternative">' + text + '</span>';
};

module.exports = Renderer;

},{"./formatters":2,"./utils":12}],10:[function(require,module,exports){
var _utils = require('../utils');
var replace = _utils.replace;
var merge = _utils.merge;
var noop = _utils.noop;


/**
 * Block-Level Grammar
 */

var block = {
  newline: /^\n+/,
  code: /^((?: {4}|\t)[^\n]+\n*)+/,
  fences: noop,
  yamlHeader: noop,
  hr: /^( *[-*_]){3,} *(?:\n|$)/,
  heading: /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n|$)/,
  nptable: noop,
  lheading: /^([^\n]+)\n *(=|-){2,} *(?:\n|$)/,
  blockquote: /^( *>[^\n]+(\n(?!def)[^\n]+)*\n*)+/,
  list: /^( *)(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
  html: /^ *(?:comment *(?:\n|\s*$)|closed *(?:\n{2,}|\s*$)|closing *(?:\n{2,}|\s*$))/,
  def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n|$)/,
  footnote: /^\[\^([^\]]+)\]: ([^\n]+)/,
  table: noop,
  paragraph: /^((?:[^\n]+\n?(?!hr|heading|lheading|blockquote|tag|def|math))+)\n*/,
  text: /^[^\n]+/,
  math: /^ *(\${2,}) *([\s\S]+?)\s*\1 *(?:\n|$)/,
  section: noop,
  bukBlock: noop,
  headerlessTable: noop
};

block._bullet = /(?:[*+-]|\d+\.)/;
block._item = /^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/;
block._item = replace(block._item, 'gm')
  (/bull/g, block._bullet)
  ();

block.list = replace(block.list)
  (/bull/g, block._bullet)
  ('hr', '\\n+(?=\\1?(?:[-*_] *){3,}(?:\\n+|$))')
  ('def', '\\n+(?=' + block.def.source + ')')
  ('footnote', block.footnote)
  ();

block.blockquote = replace(block.blockquote)
  ('def', block.def)
  ();

block._tag = '(?!(?:'
  + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code'
  + '|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo'
  + '|span|br|wbr|ins|del|img)\\b)\\w+(?!:\\/|[^\\w\\s@]*@)\\b';

block.html = replace(block.html)
  ('comment', /<!--[\s\S]*?-->/)
  ('closed', /<(tag)[\s\S]+?<\/\1>/)
  ('closing', /<tag(?:"[^"]*"|'[^']*'|[^'">])*?>/)
  (/tag/g, block._tag)
  ();

block.paragraph = replace(block.paragraph)
  ('hr', block.hr)
  ('heading', block.heading)
  ('lheading', block.lheading)
  ('blockquote', block.blockquote)
  ('tag', '<' + block._tag)
  ('def', block.def)
  ('math', block.math)
  ();

/**
 * Normal Block Grammar
 */

block.normal = merge({}, block);

/**
 * GFM Block Grammar
 */

block.gfm = merge({}, block.normal, {
  fences: /^ *(`{3,}|~{3,}) *(\S+)? *\n([\s\S]+?)\s*\1 *(?:\n|$)/,
  paragraph: /^/,
  yamlHeader: /^ *(?=```)/,
});

block.gfm.paragraph = replace(block.paragraph)
  ('(?!', '(?!'
    + block.gfm.fences.source.replace('\\1', '\\2') + '|'
    + block.list.source.replace('\\1', '\\3') + '|')
  ();

/**
 * GFM + Tables Block Grammar
 */

block.tables = merge({}, block.gfm, {
  nptable: /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/,
  table: /^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/
});

/**
 * BFM Block Grammer 
 * (Normal Block Grammer + GFM Block Grammer + Tables Block Grammer)
 */

block.bfm = merge({}, block.tables, {
  section: /^\n{2,}/,
  bukBlock: /^"{3}(?:\[#([^\]]+)\])? *(?:\n|\r)([\w\W]+?)(?:\n|\r)"{3} *\n?/,
  headerlessTable: /^ *((?: *\|.*(?:\n|$))+)\n*/
});

block.bfm.paragraph = replace(block.tables.paragraph)('\+\)\\n\*', '+)')();
/* TODO: section-divider after list */
// block.bfm.list = replace(block.tables.list)
//   ('\\n*\|\\s*', '\\n?\|\\s?')
//   ('{2,}', '{2}')
//   ();

// block.bfm.def = replace(block.tables.def)(' \*\(\?\:\\n\|\$\)', '(?: +#([^\\s]+))? *(?:\\n|$)')();

module.exports = block;

},{"../utils":12}],11:[function(require,module,exports){
var _utils = require('../utils');
var replace = _utils.replace;
var merge = _utils.merge;
var noop = _utils.noop;

/**
 * Inline-Level Grammar
 */

var inline = {
  escape: /^\\([\\`*{}\[\]()#$+\-.!_>])/,
  autolink: /^<([^ >]+(@|:\/)[^ >]+)>/,
  url: noop,
  html: /^<!--[\s\S]*?-->|^<(\w+(?!:\/|[^\w\s@]*@)\b)*?(?:"[^"]*"|'[^']*'|[^'">])*?>([\s\S]*?)?<\/\1>|^<(\w+(?!:\/|[^\w\s@]*@)\b)(?:"[^"]*"|'[^']*'|[^'">])*?>/,
  link: /^!?\[(inside)\]\(href\)/,
  reflink: /^!?\[(inside)\]\s*\[([^\]]*)\]/,
  nolink: /^!?\[((?:\[[^\]]*\]|[^\[\]])*)\]/,
  reffn: /^!?\[\^(inside)\]/,
  strong: /^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/,
  em: /^\b_((?:__|[\s\S])+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/,
  code: /^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/,
  br: /^ {2,}\n(?!\s*$)/,
  del: noop,
  text: /^[\s\S]+?(?=[\\<!\[_*`$]| {2,}\n|$)/,
  math: /^\$\$\s*([\s\S]*?[^\$])\s*\$\$(?!\$)/,
  bukLink: noop,
  idspan: noop,
  alternative: noop
};

inline._inside = /(?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*/;
inline._href = /\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*/;

inline.link = replace(inline.link)
  ('inside', inline._inside)
  ('href', inline._href)
  ();

inline.reflink = replace(inline.reflink)
  ('inside', inline._inside)
  ();

inline.reffn = replace(inline.reffn)
  ('inside', inline._inside)
  ();

/**
 * Normal Inline Grammar
 */

inline.normal = merge({}, inline);

/**
 * Pedantic Inline Grammar
 */

inline.pedantic = merge({}, inline.normal, {
  strong: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
  em: /^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/
});

/**
 * GFM Inline Grammar
 */

inline.gfm = merge({}, inline.normal, {
  escape: replace(inline.escape)('])', '~|])')(),
  url: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,
  del: /^~~(?=\S)([\s\S]*?\S)~~/,
  text: replace(inline.text)
    (']|', '~]|')
    ('|', '|https?://|')
    ()
});

/**
 * GitBook Grammar
 */
inline.gitbook = merge({}, inline.gfm, {
  // Template variable
  tplvar: /^{{\s*(.*?)\s*(?=}})}}/,

  // Template expression
  tplexpr: /^{%\s*(.*?)\s*(?=%})%}/,
});
inline.gitbook.text = replace(inline.gfm.text)
  ('~]|', '~]|'+inline.gitbook.tplvar.source+'|'+inline.gitbook.tplexpr.source+'|')
  ();

/**
 * GFM + Line Breaks Inline Grammar
 */

inline.breaks = merge({}, inline.gfm, {
  br: replace(inline.br)('{2,}', '*')(),
  text: replace(inline.gfm.text)('{2,}', '*')()
});

/**
 * BFM Block Grammer 
 * GFM + Line Breaks Inline Grammar
 */

inline.bfm = merge({}, inline.breaks, {
  bukLink: /^(?:\[@@([^\]]+)\])?(?:\[#([^\]]+)\])?\[((?:@?|@{3,})[^@][^\]]*)\]\{([^\}]*)\}/,
  idspan: /^\[@@([^\]]+)\]\{([^\}]*)\}/,
  alternative: /^\[[^\]]+\]/
});
inline.bfm.html = replace(inline.bfm.html)
  ('\(\?\!\:\\/\|\[\^\\w\\s@\]\*@\)', '')
  ();
// inline.bfm.link = replace(inline.breaks.link)
//   ('\?\\s\*', '?(?:\\s+#([^\\s]+))?\\s*')
//   ('\\)', '\\)(?:\\{([^\\}]+)\\})?')
//   ();
//inline.bfm.reflink = replace(inline.bfm.reflink)('\]\*\)\\]', ']*)\\](?:\\{([^\\}]+)\\})?')();
//inline.bfm.nolink = replace(inline.bfm.nolink)('\*\)\\]', '*)\\](?:\\{([^\\}]+)\\})?')();

module.exports = inline;

},{"../utils":12}],12:[function(require,module,exports){
/**
 * Helpers
 */

function escape(html, encode) {
  return html
    .replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function unescape(html) {
  return html.replace(/&([#\w]+);/g, function(_, n) {
    n = n.toLowerCase();
    if (n === 'colon') return ':';
    if (n.charAt(0) === '#') {
      return n.charAt(1) === 'x'
        ? String.fromCharCode(parseInt(n.substring(2), 16))
        : String.fromCharCode(+n.substring(1));
    }
    return '';
  });
}

function replace(regex, opt) {
  regex = regex.source;
  opt = opt || '';
  return function self(name, val) {
    if (!name) return new RegExp(regex, opt);
    val = val.source || val;
    val = val.replace(/(^|[^\[])\^/g, '$1');
    regex = regex.replace(name, val);
    return self;
  };
}

function noop() {}
noop.exec = noop;

function merge(obj) {
  var i = 1
    , target
    , key;

  for (; i < arguments.length; i++) {
    target = arguments[i];
    for (key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        obj[key] = target[key];
      }
    }
  }

  return obj;
}

module.exports = {
  escape: escape,
  unescape: unescape,
  replace: replace,
  noop: noop,
  merge: merge,
};

},{}]},{},[1]);
