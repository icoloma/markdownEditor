/*
Markdown Editor by Nacho and Carlos Coloma.
This work is based on showdown by John Fraser and markdown by John Gruber.
The license is MIT. Use it however you please.

Options:
* resources: JSON object with all the i18n entries
* buttons: a list of buttons to use
* value: The initial value of the textarea
* historyRate: the amount of time (in milliseconds) without user input that triggers a new entry in the history
* renderRate: the amount of time (in milliseconds) without user input that triggers a re-render HTML
*/

(function($){
	
/*
 Mathias Bynens proposal to follow changes to a textarea.
 To check what this does, see: http://mathiasbynens.be/notes/oninput
 */
$.fn.input = function(fn) {
  var $this = this;
  if (!fn) {
    return $this.trigger('keydown.input');
  }
  return $this.bind({
    'input.input': function(event) {
      $this.unbind('keydown.input');
      fn.call(this, event);
    },
    'keydown.input': function(event) {
      fn.call(this, event);
    }
  });
};

$.fn.markdownEditor = function(options) {
	
	options = $.extend({
		historyRate: 2000,
		renderRate: 300,
		buttons: [ 'b', 'i', 'a', 'blockquote', 'code', 'img', 'h', 'ul', 'undo', 'redo', 'help' ],
		resources: {
			'md-btn-b': 'Bold',
			'md-btn-i': 'Italic',
			'md-btn-a': 'Create link',
			'md-btn-blockquote': 'Quote',
			'md-btn-code': 'Code',
			'md-btn-img': 'Add image',
			'md-btn-h': 'Header',
			'md-btn-ul': 'Bullet list',
			'md-btn-undo': 'Undo',
			'md-btn-redo': 'Redo',
			'md-btn-help': 'Help',
			'md-btn-accept': 'Accept',
			'md-btn-cancel': 'Cancel'
		}
	}, options);
	
	var 

		// history of text modifications (String [])
		history = [],

		// current step in history
		hcursor = 0,

		// ShowDown converter
		converter = new Showdown.converter(),

		// creates the HTML code for a button
		createButton = function(button) {
			var name = 'md-btn-' + button;
			return '<a class="md-btn ' + name + '" title="' + options.resources[name] + '"><span class="md-icon md-icon-' + button + '">' + options.resources[name] + '</span></a>'
		}

		// container of the whole thing
		$container = $('<div class="markdown-container"><div class="markdown-toolbar"></div><textarea class="markdown-editor"></textarea><div class="markdown-preview"></div></div>'),
		$toolbar = $container.find('.markdown-toolbar'),
		$editor = $container.find('.markdown-editor'),
		$preview = $container.find('.markdown-preview')
		;

	/*
		getSelection extracted from fieldSelection jQuery plugin by Alex Brem <alex@0xab.cd>
	*/
	var e = $editor[0],

	/*
		@return if block == true, the start of the line containing the current selection
	*/
	getStart = function(value, start, block) {
		if (!block) return start;
		while (start > 1) {
			if (value[start - 1] == '\n')
				break;
			start--;
		}
		return start;
	},

	getEnd = function(value, end, block) {
		if (!block) return end;
		while (end < value.length - 1) {
			if (value[end] == '\n')
				break;
			end++;
		}
		return end;
	},

	/*
		get the current selection
	*/
	getSelection = 

		/* mozilla / dom 3.0 */
		('selectionStart' in e && function(block) { 
			var start = getStart(e.value, e.selectionStart, block);
			var end = getEnd(e.value, e.selectionEnd, block);
			var l = end - start;
			return { 
				start: start, 
				end: end, 
				length: l, 
				text: e.value.substr(start, l) 
			};
		}) ||

		/* exploder */
		(document.selection && function() {

			e.focus();

			var r = document.selection.createRange();
			if (r === null) {
				return { 
					start: 0, 
					end: e.value.length, 
					length: 0 
				}
			}

			var re = e.createTextRange();
			var rc = re.duplicate();
			re.moveToBookmark(r.getBookmark());
			rc.setEndPoint('EndToStart', re);

			// TODO: missing the getStart() invocation to select entire lines of text

			return { 
				start: rc.text.length, 
				end: rc.text.length + r.text.length,
				length: r.text.length, 
				text: r.text 
			};
		}) ||

		/* browser not supported */
		function() { return null; };


	/*
	 * replaceSelection extracted from fieldSelection jQuery plugin by Alex Brem <alex@0xab.cd>
	 */
	var replaceSelection = 

		/* mozilla / dom 3.0 */
		('selectionStart' in e && function(text, block) { 
			var start = getStart(e.value, e.selectionStart, block);
			var end = getEnd(e.value, e.selectionEnd, block);
			e.value = e.value.substr(0, start) + text + e.value.substr(end, e.value.length);
			e.selectionStart = start;
			e.selectionEnd = start + text.length;
			e.focus();
		}) ||

		// TODO: missing the getStart() invocation to select entire lines of text
		/* exploder */
		(document.selection && function(text) {
			e.focus();
			document.selection.createRange().text = text;
		}) ||

		/* browser not supported */
		function(text) {
			e.value += text;
		};

	/**
		Pushes a new entry in the history.
		New entries are pushed only 
	*/
	var historyID = 0;
	var pushHistory = function() {
		clearTimeout(historyID);
		historyID = setTimeout(function() {
			if (e.value != history[hcursor]) {
				history[++hcursor] = e.value;
				// console.log("push " + hcursor + " " + e.value);
				if (history.length > hcursor + 1) { // if 'undo' and then write something, replace the future entries
					history = history.slice(0, hcursor + 1);
					$redoBtn.attr('disabled', '');
				}
			}
		}, options.historyRate);
		$undoBtn.removeAttr('disabled');
		renderHTML();
	}

	/**
		undo an entry in the history
	*/
	var popHistory = function() {
		if (hcursor) {
			e.value = history[--hcursor];
			// console.log("pop " + hcursor + " " + e.value);
			$redoBtn.removeAttr('disabled');
			renderHTML();
		} 
		hcursor || $undoBtn.attr('disabled', '');
	}

	/**
		redo an entry in the history 
	*/
	var redoHistory = function() {
		if (hcursor < history.length - 1) {
			e.value = history[++hcursor];
			// console.log("redo " + hcursor + " " + e.value);
			if (hcursor === history.length - 1)
				$redoBtn.attr('disabled', '');
			renderHTML();
			$undoBtn.removeAttr('disabled');
		}
	}

	/**
		Update the preview container with fresh user input
		@param sync {boolean} true to do the render synchronously. Otherwise, the call will be throttled
	*/
	var renderID = 0;
	var renderHTML = function(sync) {
		if (!sync) {
			clearTimeout(renderID);
			renderID = setTimeout(function() {
				$preview.html(converter.makeHtml(e.value));
				$editor.trigger('md.change', e);
			}, options.renderRate);
		} else {
			$preview.html(converter.makeHtml(e.value));
		}
	}

	// insert buttons
	$.each(options.buttons, function(index, button) {
		$toolbar.append(createButton(button));
	});
	var $undoBtn = $toolbar.find('.md-btn-undo');
	var $redoBtn = $toolbar.find('.md-btn-redo');

	/**
		asks the user for a link title and href
	*/
	var addLink = function(callback) {
		var 
			selection = getSelection().text.replace(/\n/g, '').trim(),
			$linkForm = $(
			'<form class="md-link-form" action="#">' +
				'<input placeholder="Title" type="text" class="md-input md-title">' +
				'<input placeholder="http://" type="url" class="md-input md-href">' +
				createButton('accept') + createButton('cancel') +
			'</form>'
			),
			cancel = function() {
				$linkForm.remove();
				$toolbar.show();
				return false;
			},
			accept = function() {
				var $href = $linkForm.find('.md-href'),
					$title = $linkForm.find('.md-title'),
					href = $href.val(),
					title = $title.val() || href
				;
				replaceSelection(callback(title, href));
				pushHistory();
				$linkForm.remove();
				$toolbar.show();
				return false;
			};
		$toolbar
			.hide()
			.after($linkForm);
		$linkForm
			.on('click', '.md-btn-accept', accept)
			.on('click', '.md-btn-cancel', cancel)
			.on('keyup', '.md-input', function(e) {
				if (e.keyCode === 13)
					accept();
				else if (e.keyCode === 27)
					cancel();
			});
		if (!selection || /^http(s?):\/\//.exec(selection)) {
			$linkForm.find('.md-href').val(selection);
			$linkForm.find('.md-title').focus()
		} else {
			$linkForm.find('.md-title').val(selection);
			$linkForm.find('.md-href').focus()
		}
		
	};

	/**
		options: 
		- regex: Pattern to check if the mark must be set or removed
		- modify: Callback to modify the selection
		- undo: Callback to undo this modification
		- block: use entire lines no matter what is selected
	*/
	var updateSelection = function(o) {
		var selection = getSelection(o.block).text;
		// for commands affecting a single line, ignore multiline selections
		if (!o.block && /\n/.exec(selection))
			return;
		var parts = o.regex.exec(selection);
		var value = !parts? o.modify(selection) :
			o.undo? o.undo(selection, o) : 
			parts[1];
		replaceSelection(value, o.block);
	};

	var commands = [
		{
			cmd: 'b',
			handler: function() {
				updateSelection({
					modify: function(value) {
						return '**' + value.trim() + '**';
					},
					regex: /^\*\*(.*)\*\*$/
				});
				pushHistory();
			}
		},
		{
			cmd: 'i',
			handler: function() {
				updateSelection({
					modify: function(value) {
						return '*' + value.trim() + '*';
					},
					regex: /^\*((\*\*)?([^*]*)(\*\*))?\*$/
				});
				pushHistory();
			}
		},
		{
			cmd: 'a',
			shortcut: '⌘+k, ctrl+k',
			handler: function() {
				addLink(function(title, href) {
					return '[' + title + '](' + href + ')';
				});
			}
		},
		{
			cmd: 'code',
			shortcut: 'shift+⌘+p, shift+ctrl+p',
			handler: function() {
				updateSelection({
					modify: function(value) {
						return '`' + value + '`';
					},
					regex: /^`([^`]*)`$/
				});
				pushHistory();
			}
		},
		{
			cmd: 'blockquote',
			shortcut: '⌘+\', ctrl+\'',
			handler: function() {
				updateSelection({
					modify: function(value) {
						return '> ' + value.replace(/\n/g, '\n> ');
					},
					undo: function(value) {
						return value.replace(/(^|\n)>[ \t]*(.*)/g, "$1$2");
					},
					regex: /((^|\n)>(.*))+$/,
					block: true
				});
				pushHistory();
			}
		},
		{
			cmd: 'img',
			shortcut: 'shift+⌘+i, shift+ctrl+i',
			handler: function() {
				addLink(function(title, href) {
					return '![' + title + '](' + href + ' "' + title + '")';
				});
			}
		},
		{
			cmd: 'h',
			handler: function() {
				updateSelection({
					modify: function(value) {
						return '#' + value;
					},
					regex: /^#(.*)$/,
					block: true
				});
				pushHistory();
			}
		},
		{
			cmd: 'ul',
			shortcut: 'shift+⌘+l, shift+ctrl+l',
			handler: function() {
				updateSelection({
					modify: function(value) {
						return '* ' + value.replace(/\n/g, '\n* ');
					},
					undo: function(value) {
						return value.replace(/^[\s\t]*\*[ \t]*/mg, "");
					},
					regex: /^([\s\t]*\*.*)*$/,
					block: true
				});
				pushHistory();
			}
		},
		{
			cmd: 'undo',
			shortcut: '⌘+z, ctrl+z',
			handler: popHistory
		},
		{
			cmd: 'redo',
			shortcut: '⌘+y, ctrl+y',
			handler: redoHistory
		},
		{
			cmd: 'help',
			shortcut: 'shift+⌘+h, shift+ctrl+h',
			handler: function() {
				window.open('http://en.wikipedia.org/wiki/Markdown');
			}
		}
	];

	// disable the default behaviour of filtering key bindings when we are inside the textarea
	key.filter = function (event){
		var tagName = (event.target || event.srcElement).tagName;
		return !(tagName == 'INPUT' || tagName == 'SELECT');
	}

	// asigna handler para cada comando
	for (var i = 0; i < commands.length; i++) {
		var action = commands[i],
			cmd = action.cmd,
			handler = action.handler
		;

		// mouse
		$toolbar.on('click', '.md-btn-' + cmd, handler);

		// keyboard
		key(action.shortcut || '⌘+' + cmd + ', ctrl+' + cmd, 'markdown', handler);
	}

	$editor
		.focusin(function() {
			// set markdown scope for key bindings
			key.setScope('markdown');
		})
		.focusout(function() {
			// set default scope
			key.setScope();
		})
	;

	// this for testing only
	if (options.internals) {
		var i = options.internals;
		i.pushHistory = pushHistory;
		i.popHistory = popHistory;
		i.history = history;
	}

	// insert current value
	options.value && $editor.val(options.value);
	$editor.input(pushHistory);
	
	// initialize history
	history[hcursor] = e.value;
	renderHTML(true);
	$redoBtn.attr('disabled', '')
	$undoBtn.attr('disabled', '')

	this.html($container);

}


})(jQuery);
