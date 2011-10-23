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
*/
$.fn.markdownEditor = function(options) {
	
	// container of the whole thing
	var $container,

	// editor
	$editor,

	// preview
	$preview,

	// buttonbar
	$toolbar,

	// history of text modifications (String)
	history = [],

	// current step in history
	hcursor = 0,

	// ShowDown converter
	converter = new Showdown.converter();

	options = $.extend({
		buttons: [ 'b', 'i', 'a', 'blockquote', 'pre', 'img', 'h', 'ol', 'ul', 'undo', 'redo', 'help' ],
		resources: {
			'markdown-button-b': 'Bold',
			'markdown-button-i': 'Italic',
			'markdown-button-a': 'Create link',
			'markdown-button-blockquote': 'Quote',
			'markdown-button-pre': 'Code',
			'markdown-button-img': 'Add image',
			'markdown-button-h': 'Header',
			'markdown-button-ol': 'Numbered list',
			'markdown-button-ul': 'Bullet list',
			'markdown-button-undo': 'Undo',
			'markdown-button-redo': 'Redo',
			'markdown-button-help': 'Help'
		}
	}, options);
	$container = $('<div class="markdown-container"><div class="markdown-toolbar"></div><textarea class="markdown-editor"></textarea><div class="markdown-preview"></div></div>');
	$toolbar = $container.find('.markdown-toolbar');
	$editor = $container.find('.markdown-editor');
	$preview = $container.find('.markdown-preview');
	
	/**
	 * Get the selected text
	 */
	vat getSelection = function() {
		var s = document.getSelection || window.getSelection;
		return s? s() : document.selection.createRange().text;
	}

	/**
	 * Update the preview container with fresh user input
	 */
	var onChange = function(event) {
		var s = history[hcursor] = $editor.val();
		var html = converter.makeHtml(s);
		$preview.html(html);
	}

	// insert buttons
	$.each(options.buttons, function(index, button) {
		var name = 'markdown-button-' + button;
		$toolbar.append('<a href="#" class="markdown-button ' + name + '" title="' + options.resources[name] + '"><span class="ui-helper-hidden-accessible">' + options.resources[name] + '</span></a>');
	})

	// insert current value
	options.value && $editor.val(options.value);
	$editor.input(onChange);
	onChange();

	this.html($container);

}

})(jQuery);