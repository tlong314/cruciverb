# CruciverbJS

A JavaScript library for easily creating webpage crossword puzzles.

## Usage

Include an external script reference to cruciverb.js (or cruciverb.min.js) in your webpage before initializing the puzzle. Also remember to include an external stylesheet reference to cruciverb.css to ensure that the puzzle is rendered properly.

Basic initialization of a Cruciverb element (which will automatically create, draw, and initialize the puzzle) is done by invoking the Cruciverb constructor:

```js
var crux = new Cruciverb(options);
```

where options is an object with the keys described below.

## Options

answers - Required. A string of length 225 (i.e., 15 x 15) representing the squares of the puzzle from top left to bottom right, one row at a time. Each character should be a letter representing the answer letter in that square or an underscore _ representing a black square.

clues - Required. An object with two keys, "Across" and "Down", each pointint to an object where the keys represent the clue number, and the properties represent the corresponding clues.

hostElement - Optional. A page element that the puzzle will be rendered inside of (otherwise will be set to the <body> element).

theme - Optional. The puzzle theme (traditionally a motif/running theme that the longer clues follow).

referenceLinkName - Optional. A description of your site, or a description of some link you would like the user to visit after completing the puzzle.

referenceLinkHref - Optional. The actual link URL that users will be redirected to if they click the link provided after completing the puzzle.

onComplete - Optional. Any actions you want to occur after the puzzle is completed and after the results screen is created. If you don't want the results screen to show, you can add the line `document.getElementById("results_div").style.display = "none";`

## License

CruciverbJS is available for use under the MIT License.
