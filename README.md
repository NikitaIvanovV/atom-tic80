# atom-tic80

<big>Make and run <a href="https://tic80.com/">TIC-80</a> games in <a href="https://atom.io/">Atom</a></big>

----

* Allows you to run and make games within Atom
* Prints TIC's console output in Atom's terminal
* Provides autocompletion, datatips, syntax highlighting and snippets for TIC's API

![Showcase](https://user-images.githubusercontent.com/51688199/91285388-96dee980-e7a6-11ea-840f-44fee158a08a.gif)

## Table of Contents

* [Requirements](#requirements)
* [Installation](#installation)
* [Usage](#usage)
  * [Run](#run)
  * [Run file](#run-file)
    * [Running code files](#running-code-files)
    * [Running cart files](#running-cart-files)
  * [Project](#project)
  * [Terminal](#terminal)
  * [Autocompletion, datatips, snippets and highlighting](#autocompletion-datatips-snippets-and-highlighting)
    * [Autocomplete](#autocomplete)
    * [Datatips](#datatips)
* [Changelog](#changelog)
* [License](#license)

## Requirements

* TIC-80: **0.90.0 and above**
* [TIC-80 PRO Version](https://github.com/nesbox/TIC-80#pro-version) to be able to [create](#project) and [run](#running-code-files) code files

## Installation

Either run command:<br/>
* `apm install atom-tic80`

Or:
1. Go to Atom > Settings > Install
2. Search for `atom-tic80`
3. Click "Install"

## Usage

All commands can be ran via [Command Palette](https://flight-manual.atom.io/getting-started/sections/atom-basics/#command-palette). If you open it by pressing `Ctrl+Shift+P` and type `tic80`, you will see all the available commands.

### Run

`Tic80: Run` command simply runs TIC-80.

Although, it's not that simple because Atom needs to know how to run it. Try out the command: if it fails, go to the package settings and set the proper path to your TIC-80 executable file.

### Run file

#### Running code files

By using `Tic80: Run File` you can make your games right in Atom! Write some code, save it with `.lua` extension (or whatever TIC-80 supports) and press `Ctrl+R` (the command has a handy keybinding!).

After running the command, the essential [cartridge metadata](https://github.com/nesbox/TIC-80/wiki/the-code#cartridge-metadata) will be added at the top of your file if it's not already present.

#### Running cart files

The same command can also run `.tic` files. However, it's not recommended to edit them using Atom (or any other external text editor) because chances are this action will corrupt the files.

### Project

With `Tic80: Create Project` command you can pick a folder, choose a language and create a code file in it. The file will be opened in a new window.

### Terminal

The package can print TIC-80 console output to a terminal within Atom. You can tweak its behavior and properties in the package settings. There are also some commands to control the terminal, such as `Tic80: Show Terminal`.

![Terminal](https://user-images.githubusercontent.com/51688199/91285403-9b0b0700-e7a6-11ea-9533-67eecaf708c2.png)

### Autocompletion, datatips, snippets and highlighting

The package also includes some neat features that might make the game creation process a little bit easier.

Note: these features function only if you have your current file grammar set to TIC-80 version. It's done to prevent them from working in regular code when you don't actually make games for TIC-80. Usually the grammar is set automatically but if it's not, just [set it yourself](https://flight-manual.atom.io/using-atom/sections/grammar/).

![Set Tic-80 grammar manually](https://user-images.githubusercontent.com/51688199/128466339-0c3876f1-d4c1-48ab-a890-98c4bb43708d.png)

#### Autocomplete

Start typing any function from TIC's API and Atom will autocomplete it for you.

![Autocomplete](https://user-images.githubusercontent.com/51688199/91285376-95152600-e7a6-11ea-930d-e2aabddad208.png)

#### Datatips

Hover your mouse over any TIC-80 API function and you will see its description and parameters.

![Datatips](https://user-images.githubusercontent.com/51688199/128412685-954ddde9-c2bb-4388-9a9f-2d3be7d93385.png)

## Changelog

Changelog can be found in the [CHANGELOG](CHANGELOG.md) file or on [GitHub](https://github.com/ViChyavIn/atom-tic80/releases).

## License

This project is licensed under the terms of MIT license, See the [LICENSE](LICENSE.md) file for more info.
