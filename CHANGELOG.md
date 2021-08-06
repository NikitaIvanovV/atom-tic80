## 1.0.0

* Added compatibility for TIC-80 0.90.0 and above. Unfortunetely, due   to how command line arguments are passed in the new version, the package is no longer compatible with older versions of TIC.
* Added complete support for all the languages (except for Fennel)
* Added unique grammars for every language (e.g. `Lua TIC-80`, `JavaScript TIC-80`) to support [datatips for the API](https://github.com/ViChyavIn/atom-tic80/tree/5f8bab452c853436cc962668bd1bb9f1d393ad98#datatips) and syntax highlighting and improve autocompletion and snippets
* Added API documentation for new 0.90.0 functions
* Changed `Tic80: Create Project` behavior to make it simpler
* Prepend metatags to a file before running TIC-80 (if they are not already present)
* Added more settings
* Minor improvements
* Bug fixes


## 0.5.0
* Added Squirrel compatibility (thanks to [@Kikasuru](https://github.com/Kikasuru))


## 0.4.0
* Added option to restart TIC instead of creating a new instance when `Run` or `Run File` commands are called
* Fixed typo in `rect` autocomplete snippet (thanks to [@Josh Farquhar](https://github.com/joshfarquhar))


## 0.3.1
* Added "Open settings" button to executable-not-found notification


## 0.3.0
* Updated menus with "Create Project" command


## 0.2.0
* Major fixes and improvements to `Create Project` command
  * Allows to specify a language ([read how](README.md#how-to-make-one))
* Support for `code-watch` command line argument


## 0.1.0 - First Release
* Every feature added
* Every bug fixed
