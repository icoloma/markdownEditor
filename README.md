# Yet Another Markdown Editor
This is another markdown editor that is based on Showdown, but **NOT** on WMD. The idea is to make a lightweight, jQuery-based editor with most of the features but none of the baggage. The result is an uncompressed 8KB file.

You can see a live demo [here](http://icoloma.github.com/markdownEditor).

[![Analytics](https://ga-beacon.appspot.com/UA-3159223-5/icoloma/queue4gae)](https://github.com/icoloma/queue4gae)

## Features

* All the typical stuff: bold, italics, etc.
* Undo and redo
* Keyboard shortcuts

## The options

They are not that many:

* **historyRate**: the number of milliseconds to introduce entries in the "undo" registry. If the user starts writing, it will wait this amount of time before introducing a new entry in the history. Default is 2000.
* **renderRate**: the same concept applied to rendering preview HTML. The default is 300.
* **buttons**: the list of buttons to display. The default is `[ 'b', 'i', 'a', 'blockquote', 'pre', 'img', 'h', 'ol', 'ul', 'undo', 'redo', 'help' ]`
* **resources**: the list of labels to use, in case you need i18n.

## Bugs

A'plenty. But we are using it for a real site, and so far are quite happy.
