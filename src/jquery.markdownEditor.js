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

/*
Markdown Editor by Nacho Coloma.
This work is based on showdown by John Fraser and markdown by John Gruber.
The license is MIT. Use it however you please.

Options:
* resources: JSON object with all the i18n entries
* buttons: a list of buttons to use
* value: The initial value to use
* historyRate: the amount of time (in milliseconds) without user input that triggers a new entry in the history
* renderRate: the amount of time (in milliseconds) without user input that triggers a re-render HTML
*/
$.fn.markdownEditor = function(options) {
	
	options = $.extend({
		historyRate: 2000,
		renderRate: 300,
		buttons: [ 'b', 'i', 'a', 'blockquote', 'pre', 'img', 'h', 'ol', 'ul', 'undo', 'redo', 'help' ],
		resources: {
			'md-btn-b': 'Bold',
			'md-btn-i': 'Italic',
			'md-btn-a': 'Create link',
			'md-btn-blockquote': 'Quote',
			'md-btn-pre': 'Code',
			'md-btn-img': 'Add image',
			'md-btn-h': 'Header',
			'md-btn-ol': 'Numbered list',
			'md-btn-ul': 'Bullet list',
			'md-btn-undo': 'Undo',
			'md-btn-redo': 'Redo',
			'md-btn-help': 'Help'
		}
	}, options);
	
	var 

		// history of text modifications (String [])
		history = [],

		// current step in history
		hcursor = 0,

		// ShowDown converter
		converter = new Showdown.converter(),

		// container of the whole thing
		$container = $('<div class="markdown-container"><div class="markdown-toolbar"></div><textarea class="markdown-editor"></textarea><div class="markdown-preview"></div></div>'),
		$toolbar = $container.find('.markdown-toolbar'),
		$editor = $container.find('.markdown-editor'),
		$preview = $container.find('.markdown-preview')
		;

	/*
	 * getSelection extracted from fieldSelection jQuery plugin by Alex Brem <alex@0xab.cd>
	 */
	var e = $editor[0];
	var getSelection = 

		/* mozilla / dom 3.0 */
		('selectionStart' in e && function() { 
			var l = e.selectionEnd - e.selectionStart;
			return { 
				start: e.selectionStart, 
				end: e.selectionEnd, 
				length: l, 
				text: e.value.substr(e.selectionStart, l) 
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

			return { 
				start: rc.text.length, 
				end: rc.text.length + 
				r.text.length, 
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
		('selectionStart' in e && function(text) { 
			var start = e.selectionStart;
			e.value = e.value.substr(0, start) + text + e.value.substr(e.selectionEnd, e.value.length);
			e.selectionStart = start;
			e.selectionEnd = start + text.length;
			e.focus();
		}) ||

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
				console.log("push " + hcursor + " " + e.value);
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
			console.log("pop " + hcursor + " " + e.value);
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
			console.log("redo " + hcursor + " " + e.value);
			if (hcursor === history.length - 1)
				$redoBtn.attr('disabled', '');
			renderHTML();
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
			}, options.renderRate);
		} else {
			$preview.html(converter.makeHtml(e.value));
		}
	}

	// insert buttons
	$.each(options.buttons, function(index, button) {
		var name = 'md-btn-' + button;
		$toolbar.append('<a class="md-btn ' + name + '" title="' + options.resources[name] + '"><span class="ui-helper-hidden-accessible">' + options.resources[name] + '</span></a>');
	});
	var $undoBtn = $toolbar.find('.md-btn-undo');
	var $redoBtn = $toolbar.find('.md-btn-redo');

	/**
		options: 
		- mark to set/remove. i.e.: '**'
		- pattern. Pattern to check if the mark must be set or removed
		- notBilateral: add the mark only as prefix, not suffix. Default is false.
	*/
	var updateSelection = function(options) {
		var selection = getSelection().text;
		var value = options.mark + 
			selection + 
			(options.notBilateral? '' : options.mark)
		;
		if (options.regex.exec(selection)) {
			value = selection.substring(options.mark.length, 
				(options.notBilateral? selection.length : selection.length - options.mark.length)
			);
		}
		replaceSelection(value);
	};

	$toolbar
		.on('click', '.md-btn-b', function() {
			updateSelection({
				mark: '**', 
				regex: /^\*\*.*\*\*$/
			});
			pushHistory();
		})
		.on('click', '.md-btn-i', function() {
			updateSelection({
				mark: '*', 
				regex: /^\*(\*\*)?[^*]*(\*\*)?\*$/
			});
			pushHistory();
		})
		.on('click', '.md-btn-a', function() {
			var selection = getSelection().text;
			replaceSelection('[' + selection + '](' + selection + ' "' + selection + '")');
			pushHistory();
		})
		.on('click', '.md-btn-pre', function() {
			updateSelection({
				mark: '`', 
				regex: /^`[^`]*`$/
			});
			pushHistory();
		})
		.on('click', '.md-btn-blockquote', function() {
			updateSelection({
				mark: '\n>', 
				regex: /^\n>.*$/, 
				notBilateral: true
			});
			pushHistory();
		})
		.on('click', '.md-btn-h', function() {
			updateSelection({
				mark: '#', 
				regex: /^#.*#$/
			});
			pushHistory();
		})
		.on('click', '.md-btn-ul', function() {
			var set = updateSelection({
				mark: '\n* ', 
				regex: /^\n\*\s.*$/, 
				notBilateral: true
			});
			pushHistory();
		})
		.on('click', '.md-btn-undo', popHistory)
		.on('click', '.md-btn-redo', redoHistory)
		.on('click', '.md-btn-help', function() {
			window.open('http://en.wikipedia.org/wiki/Markdown');
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