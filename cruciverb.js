/**
 * Cruciverb
 *
 * A JavaScript library that quickly creates interactive,
 * size-responsive, touch-capable crossword puzzles
 * for web pages.
 * 
 * @author Tim Scott Long
 * @copyright Tim Scott Long 2017-2021
 * @license Available for use under the MIT License
 */
;var Cruciverb = (function(){

	var KEY_HIGHLIGHT_MAX = 10;

	var self = null,
		storedParameters = null,
		touchDetected = false,
		linkHref = "",
		linkName = "",
		playerSquarePos = 0,
		cWidth = 450, // Default puzzle width (in pixels)
		squareSize = 30,
		direction = "horizontal", // Otherwise "vertical"
		hostElm = document.body, // Host in entire page body by default
		resultsShown = false,
		highlightStart = 0,
		highlightEnd = 0,
		highlightLength = 0,
		enteredArray = [],
		squareNumber = [],
		puzzleStarted = false,
		initialized = false,
		canvas = null,
		ctx = null,
		onCompleteCallback = undefined,

		//Stores a naming prefix for saving puzzles in localStorage
		prefix = window.location.pathname.substr(window.location.pathname.lastIndexOf("/")+1, window.location.pathname.lastIndexOf(".html")-1-window.location.pathname.lastIndexOf("/")) + "-",

	// Quick reference used for key presses
	azArray = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"],

	answerArray = [],

	cluesObj = {
		Across: {},
		Down: {}
	},

	keyHighlightTime = {};

	for(var i = 0; i < azArray.length; i++) {
		keyHighlightTime[ azArray[i] ] = 0;
	}

	keyHighlightTime["Backtab"] = 0;
	keyHighlightTime["Tab"] = 0;
	keyHighlightTime["Space"] = 0;
	keyHighlightTime["Backspace"] = 0;
	keyHighlightTime["Delete"] = 0;
	keyHighlightTime["Up"] = 0;
	keyHighlightTime["Down"] = 0;
	keyHighlightTime["Left"] = 0;
	keyHighlightTime["Right"] = 0;

	/**
	 * @description Helper function to draw a line connecting two points on an HTML canvas.
	 * @param {number} x1 - x-value of first point.
	 * @param {number} y1 - y-value of first point.
	 * @param {number} x2 - x-value of second point.
	 * @param {number} y2 - y-value of second point.
	 * @param {object} c - canvas context object.
	 */
	var drawLine = function(x1, y1, x2, y2, c) {
		c.beginPath();
		c.moveTo(x1, y1);
		c.lineTo(x2, y2);
		c.stroke();
	};

	/**
	 * Helper function to draw a key scaled up a little
	 * to denote it has just been pressed.
	 * @param {number} x - x-value of top left corner
	 * @param {number} y - y-value of top left corner
	 * @param {number} width - the original width
	 * @param {number} height - the original height
	 * @param {object} c - canvas context object
	 */
	var fillActiveRect = function(x, y, width, height, c) {
		c.save();
		c.shadowColor = "rgba(0, 0, 0, 0.35)";
		c.shadowOffsetX = 1;
		c.shadowOffsetY = 1;
		c.shadowBlur = 4;
		c.fillStyle = "rgb(230, 245, 255)";

		c.fillRect(x - 2, y - 2,
			width + 4, height + 4);

		c.restore();
	};

	/**
	 * @description The constructor function for the library to build on.
	 * @param {object} options - An object of parameters passed in when creating a Cruciverb instance.
	 * @returns {object} - The current Cruciverb object.
	 */
	var Cruciverb = function(options) {
		storedParameters = options;

		var answerArr = options.answers,
			cluesObject = options.clues,
			keyHighlights = options.keyHighlights || true; // show key zooming by default

		self = this;

		linkHref = linkHref || options.referenceLinkHref || "";
		linkName = linkName || options.referenceLinkName; // These values won't exist when initialize is called on page resize.
		hostElm = options.hostElement || hostElm;
		hostElm.classList.add("cruciverbHostElm");
		onCompleteCallback = options.onComplete || function(){};
		
		if(!initialized) {
			hostElm.innerHTML = '<div id="topClue_div"></div><canvas id="cruciverb_canvas" width="450" height="450" ></canvas>' +
				'<div id="right_div"><div id="across_div"><h2>Across</h2><ul id="across_ul">' +
				'</ul></div><div id="down_div"><h2>Down</h2><ul id="down_ul"></ul></div></div>' +
				'<br/><span id="theme_span"></span>';
		}

		// These values will be undefined when we re-initialize as page is resized.
		if(typeof answerArr !== "undefined") {
			if(typeof answerArr === "string") {
				answerArr = answerArr.split("");
			}

			for(var i = 0, len=answerArr.length; i < len; i++) {
				answerArray.push(answerArr[i]);

				//Fill the answer array with elements, rather than starting with all undefineds
				if(answerArray[i] === "_")
					enteredArray.push("_");
				else
					enteredArray.push("");
			}
		}

		if(typeof cluesObject !== "undefined") {
			for(var x in cluesObject.Across) {
				cluesObj.Across[x] = cluesObject.Across[x];
			}
			
			for(var x in cluesObject.Down) {
				cluesObj.Down[x] = cluesObject.Down[x];
			}
		}

		if(typeof options.title !== "undefined" || typeof options.theme !== "undefined" ) {
			document.getElementById("theme_span")
				.innerHTML = "Title: " +
				(options.title || options.theme);
		}

		canvas = document.getElementById("cruciverb_canvas");
		ctx = canvas.getContext("2d");

		// Set the puzzle canvas size
		cWidth = getPuzzleWidth();
		squareSize = getSquareWidth();

		if(document.documentElement.clientWidth <= 400) {
			document.body.style.margin = "0";
			canvas.style.border = "0";
			canvas.style.width = cWidth + "px";
			canvas.style.height = cWidth + "px";
			canvas.setAttribute("width", cWidth+"px");
			canvas.setAttribute("height", cWidth+"px");			
		} else {
			canvas.style.width = cWidth + "px";
			canvas.style.height = cWidth + "px";
			canvas.setAttribute("width", cWidth+"px");
			canvas.setAttribute("height", cWidth+"px");
		}
		
		// Add the custom onscreen keyboard.
		if(touchDetected) {
			canvas.style.height = (cWidth + 6*squareSize) + "px";
			canvas.setAttribute("width", cWidth+"px");
			canvas.setAttribute("height", (cWidth + 6*squareSize)+"px");
		}

		getSavedAnswers();
		renderScreen();
		createResults();
		puzzleStarted = true;

		if(!initialized) {
			setHighlightEnd(answerArray.indexOf("_")-1); // Set up initial highlight clue.
			highlightClue("across1_li");

			canvas.addEventListener("click", canvasClicked, false);
			window.addEventListener("keydown", keyHit, false);
			window.addEventListener("touchstart", detectTouch, false);

			if(keyHighlights) {
				requestAnimationFrame(keyUpdate);
			}

			initialized = true; // Avoid doubling up on event handlers when page is resized
		}
	};

	/** Manage single frame of key scaling animation */
	var keyUpdate = function() {
		for(var key in keyHighlightTime) {
			if(keyHighlightTime[key] > 0) {
				keyHighlightTime[key]--;
			}
		}

		renderScreen();
		requestAnimationFrame(keyUpdate);
	};

	window.initializeCruciverb = Cruciverb.prototype.constructor = Cruciverb;
	window.addEventListener("resize", initializeCruciverb, false);

	/**
	 * @description Having detected that the device is touch-capable and the user has
	 *   touched the screen, shows canvas keyboard and sets touchDetected variable.
	 */
	var detectTouch = function() {
		document.body.style.margin = "0";
		canvas.style.border = "0";
		canvas.style.width = cWidth + "px";
		canvas.style.height = (cWidth + 6*squareSize) + "px";
		canvas.setAttribute("width", cWidth+"px");
		canvas.setAttribute("height", (cWidth + 6*squareSize)+"px");
		touchDetected = true;
		window.removeEventListener("touchstart", detectTouch, false);
		renderScreen();
	};

	/**
	 * @description Stores the current table cell values in the browsers web storage.
	 */
	var savePuzzle = Cruciverb.prototype.savePuzzle = function() {
		for(var i = 0, len = enteredArray.length; i < len; i++) {
			localStorage.setItem(prefix + "enteredArray[" + i + "]", enteredArray[i]);
		}
	};
	
	/**
	 * @description Gets the x and y coordinates (in pixels) in the puzzle table from the nth cell in the table.
	 * @param {number} n - The number index of the cell.
	 * @returns {Object} - An plain JavaScript object with two keys: x for the returned x-value, y for the
	 *   returned y-value.
	 */
	var getCoordsFromSquare = Cruciverb.prototype.getCoordsFromSquare = function(n) {
		return {
			x: squareSize*(n % 15),
			y: squareSize*(Math.floor(n / 15))
		};
	};
	
	/**
	 * @description Gets the number index of the puzzle table cell, at the given x and y value.
	 * @param {number | Object} x - The x-value of the point, or an object with keys x (for
	 *   the x-value of the point) and y (for the y-vaue of the point).
	 * @param {number} y - The y-value of the point.
	 * @returns {number}
	 */
	var getSquareFromCoords = Cruciverb.prototype.getSquareFromCoords = function(x, y) {
		if(typeof x === "object") {
				y = x.y;
				x = x.x;
		}
		
		x /= squareSize;
		y /= squareSize;

		return playerSquarePos = 15 * y + x;
	};

	/**
	 * @description Draws black cells into the puzzle table.
	 */
	var setBlackSquares = function() {
		ctx.fillStyle = "black";

		for(var i = 0; i < 225; i++) { //*** This should be generalized for larger puzzles
			if(answerArray[i] == "_") {
				ctx.fillRect(squareSize*(i%15), squareSize*Math.floor(i/15), squareSize, squareSize);
			}
		}
	};

	/**
	 * @description Draws clue numbers in the appropriate cells.
	 */
	var setClueNumbers = function() {
		ctx.fillStyle = "black";
		ctx.font = Math.max(Math.floor(squareSize/3), 5) + "px Arial, sans-serif";
		ctx.textBaseline = "alphabetic";

		var idx = 0;

		for(var i = 0; i < 225; i++) {
			if(answerArray[i] != "_") {
				if(i%15 == 0 || i < 15 || (i >= 1 && answerArray[i-1] == "_") || (i >= 15 && answerArray[i-15] == "_")) {

					ctx.fillText((idx+1),
						getCoordsFromSquare(i).x + squareSize/10,
							getCoordsFromSquare(i).y + Math.max(squareSize/3, 5),
							squareSize/2);

					squareNumber[i] = idx+1;
					
					//Determine if Across or Down or both, and create a clue div accordingly
					if(!puzzleStarted) {
						if(i%15 == 0 || (i >= 1 && answerArray[i-1] == "_")) { // Across
							var newLi = document.createElement("LI")							
							newLi.id = "across" + (idx+1) + "_li";
							document.getElementById("across_ul").appendChild(newLi);

							checkForAddedElement(i, idx, "a");
						}
						
						if(i < 15 || (i >= 15 && answerArray[i-15] == "_"))//Down
						{
							var newLi = document.createElement("LI");
							//var tN = document.createTextNode((idx+1) + ". " + cluesObj.Down[idx+1]);
							//newLi.appendChild(tN);
							
							newLi.id = "down" + (idx+1) + "_li";
							document.getElementById("down_ul").appendChild(newLi);
							
							checkForAddedElement(i, idx, "d");
						}
					}
					
					idx++;
				}
			}
		}
	};

	/**
	 * @description Begins applying DOM updates if DOM has been drawn to the screen; otherwise waits and tries again.
	 */
	var checkForAddedElement = function(pos, id, aOrD) {
		if(document.getElementById("across" + (id+1) + "_li") != null && aOrD == "a") {
			document.getElementById("across" + (id+1) + "_li").innerHTML = (id+1) + ". " + cluesObj.Across[id+1];
			
			document.getElementById("across" + (id+1) + "_li").addEventListener("click", function(e){direction="horizontal"; setPlayerSquarePos(pos); drawHighlight(pos); highlightClue(this.id);}, false);
		} else if(document.getElementById("down" + (id+1) + "_li") != null && aOrD == "d") {
			document.getElementById("down" + (id+1) + "_li").innerHTML = (id+1) + ". " + cluesObj.Down[id+1];
			
			document.getElementById("down" + (id+1) + "_li").addEventListener("click", function(e){direction="vertical"; setPlayerSquarePos(pos); drawHighlight(pos); highlightClue(this.id);}, false);
		} else
			setTimeout(function(){checkForAddedElement(id);}, 100); // Nothing found on the current screen. Try again in 100ms.
	};
	
	/**
	 * @description Highlight the selected clue (or corresponding clue to the selected table cell).
	 * @param {string} id - The id attribute of the clue list item.
	 */
	var highlightClue = function(id) {
		var lis = document.querySelectorAll("#right_div li");

		for(var i = 0, len=lis.length; i < len; i++) {
			if(lis[i].id == id) {
				lis[i].style.backgroundColor = "rgb(230, 245, 255)";
				document.getElementById("topClue_div").innerHTML = lis[i].innerHTML;
			} else
				lis[i].style.backgroundColor = "white";
		}
	};

	/**
	 * @description Imports saved clues from web storage.
	 */
	var getSavedAnswers = Cruciverb.prototype.getSavedAnswers = function() {
		if(window.localStorage) {
			for(i = 0, len = answerArray.length; i < len; i++) {
				if(localStorage.getItem(prefix + "enteredArray[" + i + "]")) {
					enteredArray[i] = localStorage.getItem(prefix + "enteredArray[" + i + "]");
				} else {
					if(enteredArray[i] !== "_")
						enteredArray[i] = "";
				}

				if(enteredArray[i] + "" === "null" || enteredArray[i] + "" === "undefined") {
					enteredArray[i] = "";
				}
			}
		}
	};

	/**
	 * @description Moves clue list to selected cell's corresponding clue.
	 * @param {number} num - The clue number.
	 */
	var scrollToClue = function(num) {
		if(direction == "horizontal") {
			highlightClue("across" + num + "_li");
			
			var t = document.getElementById("across" + num + "_li").offsetTop;
			document.getElementById("across_div").scrollTop = t;
		} else {
			highlightClue("down" + num + "_li");
			
			var t = document.getElementById("down" + num + "_li").offsetTop;
			document.getElementById("down_div").scrollTop = t;
		}
	};
	
	/**
	 * @description Reads a click of the puzzle table or the canvas keyboard, and sets styles and positions accordingly.
	 * @param {Object} e - The click event object.
	 */
	var canvasClicked = function(e) {
		var oldPlayerSquarePos = playerSquarePos,
				rect = canvas.getBoundingClientRect();

		fingerX = e.clientX - rect.left;
		fingerY = e.clientY - rect.top;
		
		if(fingerY > getPuzzleWidth()) {
			canvasKeyboardClicked(fingerX, fingerY - getPuzzleWidth());
			return;
		}
	
		fingerX = Math.floor(fingerX/squareSize);
		fingerY = Math.floor(fingerY/squareSize);

		if(answerArray[15*fingerY + fingerX] != "_") {
			playerSquarePos = 15*fingerY + fingerX;
		} else {
			return;
		}

		if(playerSquarePos == oldPlayerSquarePos) {
			toggleDirection();
		}

		var idx = playerSquarePos;
		if(direction == "horizontal") {
			//Search left from current position until we hit a black square or the end of the puzzle
			while(answerArray[idx] !== "_" && idx%15 !== 0) {
				idx--;
			}
			
			if(answerArray[idx] === "_")
				idx++;

			setHighlightStart(idx);
			
			idx = playerSquarePos;
			
			//Search left from current position until we hit a black square or the end of the puzzle
			while(answerArray[idx] !== "_" && idx % 15 !== 14) {
				idx++;
			}

			setHighlightEnd(idx);
		} else {
			while(answerArray[idx] !== "_" && idx >= 0) {
				idx-=15;
			}
			
			idx+=15;
			setHighlightStart(idx);
			
			idx = playerSquarePos;
			while(answerArray[idx] !== "_" && idx <= 224) {
				idx+=15;
			}

			setHighlightEnd(idx);
		}

		renderScreen();

		scrollToClue( squareNumber[ getHighlightStart() ] );
	};

	/**
	 * @description	Creates an event-like object based on which "canvas key" is pressed, and passes into the keyHit function.
	 * @param {number} x - The x-value (in pixels) on the canvas keyboard where the original touch event was detected. 
	 * @param {number} y - The y-value (in pixels) on the canvas keyboard where the original touch event was detected. 
	 */
	var canvasKeyboardClicked = function(x, y) {
		// The event-like object, which only contains the properties considered in keyHit()
		var keyObj = {
			preventDefault: function(){},
			which: 0,
			shiftKey: false
		};

		var keySize = 3*squareSize/2, pw = getPuzzleWidth();
		ctx.font = Math.floor(keySize/2) + "px Arial, sans-serif";
		
		if(y <= keySize) { // First row
			if(x < keySize) { // Q
				keyObj.which = 81;
			} else if(x < 2*keySize) { // W
				keyObj.which = 87;
			} else if(x < 3*keySize) { // E 
				keyObj.which = 69;
			} else if(x < 4*keySize) { // R
				keyObj.which = 82;
			} else if(x < 5*keySize) { // T
				keyObj.which = 84;
			} else if(x < 6*keySize) { // Y
				keyObj.which = 89;
			} else if(x < 7*keySize) { // U
				keyObj.which = 85;
			} else if(x < 8*keySize) { // I
				keyObj.which = 73;
			} else if(x < 9*keySize) { // O
				keyObj.which = 79;
			} else { // P
				keyObj.which = 80;
			}
		} else if(y <= 2*keySize) { // Second row
			if(x < keySize + squareSize/2) { // A
				keyObj.which = 65;
			} else if(x < 2*keySize + squareSize/2) { // S
				keyObj.which =	83;
			} else if(x < 3*keySize + squareSize/2) { // D
				keyObj.which = 68;
			} else if(x < 4*keySize + squareSize/2) { // F
				keyObj.which = 70;
			} else if(x < 5*keySize + squareSize/2) { //G
				keyObj.which = 71;
			} else if(x < 6*keySize + squareSize/2) { // H
				keyObj.which = 72;
			} else if(x < 7*keySize + squareSize/2) { // J
				keyObj.which = 74;
			} else if(x < 8*keySize + squareSize/2) { // K
				keyObj.which = 75;
			} else { // L
				keyObj.which = 76;
			}
		} else if(y <= 3*keySize) { // Third row
			if(x < keySize) { // SHIFT + TAB
				keyObj.which = 9;
				keyObj.shiftKey = true;
			} else if(x < 2*keySize) { // Z
				keyObj.which = 90;
			} else if(x < 3*keySize) { // X
				keyObj.which = 88;
			} else if(x < 4*keySize) { // C
				keyObj.which = 67;
			} else if(x < 5*keySize) { // V
				keyObj.which = 86;
			}
			else
			if(x < 6*keySize)//B
			{
				keyObj.which = 66;
			}
			else
			if(x < 7*keySize)//N
			{
				keyObj.which = 78;
			}
			else
			if(x < 8*keySize)//M
			{
				keyObj.which = 77;
			}
			else
			if(x < 9*keySize)//UP
			{
				keyObj.which = 38;
			}
			else//TAB
			{
				keyObj.which = 9;
			}
		}
		else//Fourth row
		{
			if(x < 2.5*squareSize)//BKSP
			{
				keyObj.which = 8;
			}
			else
			if(x < 5.5*squareSize)//DEL
			{
				keyObj.which = 46;
			}
			else
			if(x < 10.5*squareSize)//SPACE
			{
				keyObj.which = 32;
			}
			else
			if(x < 10.5*squareSize + keySize)//LEFT
			{
				keyObj.which = 37;
			}
			else
			if(x < 10.5*squareSize + 2*keySize)//DOWN
			{
				keyObj.which = 40;
			}
			else//RIGHT
			{
				keyObj.which = 39;
			}
		}

		keyHit(keyObj);
	};

	/**
	 * @description Determines where the stop and start positions should be for the current highlight "rectangle."
	 * @param {number} idx - The puzzle table cell number index where the highlight is based.
	 */
	var drawHighlight = function(idx) {
		if(direction == "horizontal")
		{
			//Search left from current position until we hit a black square or the end of the puzzle
			while(answerArray[idx] != "_" && idx%15 != 0)
			{
				idx--;
			}
			
			if(answerArray[idx] == "_")
				idx++;

			setHighlightStart(idx);
			
			idx = playerSquarePos;
			
			//Search left from current position until we hit a black square or the end of the puzzle
			while(answerArray[idx] != "_" && idx%15 != 14)
			{
				idx++;
			}

			setHighlightEnd(idx);
		}
		else
		{
			while(answerArray[idx] != "_" && idx >= 0)
			{
				idx-=15;
			}
			
			idx+=15;
			setHighlightStart(idx);
			
			idx = playerSquarePos;
			while(answerArray[idx] != "_" && idx <= 224)
			{
				idx+=15;
			}

			setHighlightEnd(idx);			
		}

		renderScreen();
	};

	/**
	 * @description Reads values from a key press on the actual keyboard or the canvas keyboard.
	 * @param {Object} e - The event from the key press, or a "mock" event object based on a touch of the canvas keyboard.
	 */
	var keyHit = Cruciverb.prototype.keyHit = function(e) {
		e.preventDefault();

		switch(e.which) {
			case 37: // Left.
				{
					keyHighlightTime["Left"] = KEY_HIGHLIGHT_MAX;

					if(playerSquarePos == 0)
						playerSquarePos = answerArray.length-1;
					else
					do
					{
						playerSquarePos--;
					}
					while(answerArray[playerSquarePos] === "_");
				}
				break;
			case 39: // Right.				
				{
					keyHighlightTime["Right"] = KEY_HIGHLIGHT_MAX;

					window.answerArray = answerArray;
					
					do
					{
						playerSquarePos++;
						playerSquarePos %= answerArray.length;
					}
					while(answerArray[playerSquarePos] === "_");
				}
				break;
			case 38: // Up.
				{
					keyHighlightTime["Up"] = KEY_HIGHLIGHT_MAX;

					do
					{
						if(playerSquarePos < 15) {
							playerSquarePos += answerArray.length;
						}

						playerSquarePos-= 15;
					}
					while(playerSquarePos < 0 || answerArray[playerSquarePos] === "_");
				}
				break;
			case 40: // Down.
				{
					keyHighlightTime["Down"] = KEY_HIGHLIGHT_MAX;

					do
					{
						if(playerSquarePos > 209) { // Generalized: answerArray.length - 1 - Math.sqrt(answerArray.length)
							playerSquarePos -= 225;
						}

						playerSquarePos+= 15;
					}
					while(playerSquarePos > answerArray.length || answerArray[playerSquarePos] === "_");
				}
				break;
			case 32: // Space.
				{
					keyHighlightTime["Space"] = KEY_HIGHLIGHT_MAX;
					toggleDirection();
				}
				break;
			case 8: // Backspace
				{
					keyHighlightTime["Backspace"] = KEY_HIGHLIGHT_MAX;

					if(direction == "horizontal")
					{
						if(enteredArray[playerSquarePos] === "" && playerSquarePos > 0) {
							do {
								playerSquarePos--;
							}
							while(answerArray[playerSquarePos] === "_" && playerSquarePos > 0)
						}
					}
					else
					{
						if(enteredArray[playerSquarePos] === "" && playerSquarePos >= 15) {
							do {
								playerSquarePos -= 15;
							}
							while(answerArray[playerSquarePos] === "_" && playerSquarePos >= 15)
						}
					}

					enteredArray[playerSquarePos] = "";
					localStorage.setItem(prefix + "enteredArray[" + playerSquarePos + "]", "");
				}
				break;
			case 46: // Delete.
				{
					keyHighlightTime["Delete"] = KEY_HIGHLIGHT_MAX;

					enteredArray[playerSquarePos] = "";
					localStorage.setItem(prefix + "enteredArray[" + playerSquarePos + "]", "");
				}
				break;
			case 9: // Tab
				{
					if(e.shiftKey)
					{
						keyHighlightTime["Backtab"] = KEY_HIGHLIGHT_MAX;

						if(playerSquarePos == 0)
							playerSquarePos = answerArray.length-1;
						else
						do {
							playerSquarePos--;
						}
						while((playerSquarePos%15 !== 0 || answerArray[playerSquarePos] === "_") && (answerArray[playerSquarePos-1] !== "_" || answerArray[playerSquarePos] === "_"));
					}
					else
					{
						keyHighlightTime["Tab"] = KEY_HIGHLIGHT_MAX;

						if(playerSquarePos == answerArray.length-1)
							playerSquarePos = 0;
						else
						do {
							playerSquarePos++;
							playerSquarePos %= answerArray.length;
						}
						while((playerSquarePos % 15 !== 0 || answerArray[playerSquarePos] === "_") && (answerArray[playerSquarePos - 1] !== "_" || answerArray[playerSquarePos] === "_"));
					}
				}
				break;
			default:
				{
					if(e.which >= 65 && e.which <= 90) // A-Z letter keys.
					{
						enteredArray[playerSquarePos] = azArray[e.which - 65];
						keyHighlightTime[ azArray[e.which - 65] ] = KEY_HIGHLIGHT_MAX;

						localStorage.setItem(prefix + "enteredArray[" + playerSquarePos + "]", enteredArray[playerSquarePos]);

						if(direction == "horizontal") {
							do
							{
								playerSquarePos++;
								playerSquarePos %= answerArray.length;
							}
							while(answerArray[playerSquarePos] === "_" || answerArray[playerSquarePos] === "block");
						}
						else {
							do
							{
								if(playerSquarePos > 209) {
									playerSquarePos -= 225;
								}

								playerSquarePos+= 15;
							}
							while(answerArray[playerSquarePos] === "_");
						}
					}
				}
				break;
		}

		renderScreen();
		drawHighlight(playerSquarePos);
		scrollToClue( squareNumber[ getHighlightStart() ] );

		if(isComplete() && !resultsShown) {
			showResults();
			onCompleteCallback.call(self);
		}
	};

	/**
	 * @description Toggles the internal "direction" variable between horizontal and vertical.
	 */
	var toggleDirection = Cruciverb.prototype.toggleDirection = function(){
			direction = (direction == "horizontal") ? "vertical" : "horizontal";
	};

	/**
	 * @description Uses the screen size to determine optimal puzzle dimensions' width in pixels.
	 * @returns {number} - The optimal width for the square puzzle.
	 */
	var getPuzzleWidth = Cruciverb.prototype.getPuzzleWidth = function(){
			var pWidth = Math.min(document.documentElement.clientWidth, 450);

			// We want our puzzle dimensions to be divisble by the number of squares in a row (15).
			while(pWidth%15 !== 0) {
				pWidth--;
			}

			return pWidth;
	};

	/**
	 * @description Gets the optimal height in pixels for the square puzzle based on current screen size.
	 * @returns {number}
	 */
	Cruciverb.prototype.getPuzzleHeight = function(){
			return getPuzzleWidth();
	};

	/**
	 * @description Returns the current width (in pixels) of a puzzle square.
	 * @returns {number}
	 */
	var getSquareWidth = Cruciverb.prototype.getSquareWidth = function(){
		return getPuzzleWidth() / 15;
	};

	/**
	 * @description Draws the square puzzle in its current state.
	 */
	var renderScreen = function(){
		ctx.clearRect(0, 0, cWidth, cWidth);
		ctx.fillStyle = "#FFFFAA";
		ctx.fillStyle = "rgb(255, 255, 230)";

		if(direction == "horizontal"){
			ctx.fillRect(squareSize*(getHighlightStart()%15), squareSize*Math.floor(getHighlightStart()/15), getHighlightLength()*squareSize, squareSize);
		}
		else {
			ctx.fillRect(squareSize*(getHighlightStart()%15), squareSize*Math.floor(getHighlightStart()/15), squareSize, getHighlightLength()*squareSize);
		}

		ctx.strokeStyle = "black";
		var pW = getPuzzleWidth(),
			sW = getSquareWidth();

		for(var i = 0; i <= pW; i += sW) {
			drawLine(i, 0, i, pW, ctx);
			drawLine(0, i, pW, i, ctx);
		}
		
		setBlackSquares();
		setClueNumbers();

		// stroke a square over the current active square
		ctx.strokeStyle = "rgb(0, 0, 200)";
		ctx.strokeRect(squareSize*(playerSquarePos%15), squareSize*Math.floor(playerSquarePos/15), squareSize, squareSize);

		ctx.font = Math.floor(squareSize / 2) + "px Arial, sans-serif";
		ctx.textBaseline = "middle";

		for(var i = 0; i < answerArray.length; i++) {
			if(enteredArray[i] != "_") {
			 ctx.fillText(enteredArray[i] || "",
				getCoordsFromSquare(i).x + squareSize / 2
					- ctx.measureText(enteredArray[i] || "").width / 2,
				getCoordsFromSquare(i).y + (squareSize / 2));
			}
		}

		// Keyboard		
		var keyLetters = ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P",
			"A", "S", "D", "F", "G", "H", "J", "K", "L",
			"Z", "X", "C", "V", "B", "N", "M"],
			keySize = 3*squareSize/2,
			pw = getPuzzleWidth();

		ctx.font = Math.floor(.5 * keySize) + "px Arial, sans-serif";
		ctx.textBaseline = "middle";
		ctx.fillStyle = "rgb(245, 250, 255)";
		ctx.fillRect(0, pw, pw, keySize * 4);
		ctx.fillStyle = "rgb(25, 25, 25)";
		ctx.strokeStyle = "rgb(230, 245, 255)";

		// Letters on top row of keyboard
		for(var i = 0; i <10 ; i++) {
			ctx.strokeRect(i * keySize, pw, keySize, keySize);

			if(keyHighlightTime[ keyLetters[i] ] > 0) {
				fillActiveRect(i * keySize, pw, keySize, keySize, ctx);
				ctx.fillStyle = "rgb(25, 25, 25)";
				ctx.font = Math.floor(.6 * keySize) + "px Arial, sans-serif";
				ctx.textBaseline = "middle";
				ctx.fillText(keyLetters[i],
					i * keySize + keySize / 2
						- ctx.measureText(keyLetters[i]).width / 2,
					pw + keySize / 2);
			}
			else {
				ctx.fillStyle = "rgb(25, 25, 25)";
				ctx.font = Math.floor(.35 * keySize) + "px Arial, sans-serif";
				ctx.textBaseline = "middle";
				ctx.fillText(keyLetters[i],
					i * keySize + keySize / 2
						- ctx.measureText(keyLetters[i]).width / 2,
					pw + keySize / 2);
			}
		}

		ctx.fillStyle = "rgb(25, 25, 25)";
		ctx.strokeStyle = "rgb(230, 245, 255)";
		ctx.font = Math.floor(.5 * squareSize) + "px Arial, sans-serif";

		for(var i = 0; i < 9; i++) {
			ctx.strokeRect(squareSize / 2 + i * keySize, pw + keySize, keySize, keySize);

			if(keyHighlightTime[ keyLetters[i + 10] ] > 0) {
				fillActiveRect(squareSize / 2 + i * keySize, pw + keySize, keySize, keySize, ctx);
				ctx.fillStyle = "rgb(25, 25, 25)";
				ctx.font = Math.floor(.6 * keySize) + "px Arial, sans-serif";
				ctx.textBaseline = "middle";
				ctx.fillText(keyLetters[i + 10],
					squareSize / 2 + i * keySize + keySize / 2
						- ctx.measureText(keyLetters[i + 10]).width / 2,
					pw + 3 * keySize / 2);
			}
			else {
				ctx.fillStyle = "rgb(25, 25, 25)";
				ctx.font = Math.floor(.35 * keySize) + "px Arial, sans-serif";
				ctx.textBaseline = "middle";
				ctx.fillText(keyLetters[i + 10],
					squareSize / 2 + i * keySize + keySize / 2
						- ctx.measureText(keyLetters[i + 10]).width / 2,
					pw + 3 * keySize / 2);
			}
		}

		for(var i = 0; i <7 ; i++) {
			ctx.strokeRect((i+1)*keySize, pw + 2*keySize, keySize, keySize);

			if(keyHighlightTime[ keyLetters[i + 19] ] > 0) {
				fillActiveRect((i+1)*keySize, pw + 2*keySize, keySize, keySize, ctx);
				ctx.fillStyle = "rgb(25, 25, 25)";
				ctx.font = Math.floor(.6 * keySize) + "px Arial, sans-serif";
				ctx.textBaseline = "middle";
				ctx.fillText(keyLetters[i+19],
					(i + 1) * keySize + keySize / 2
						- ctx.measureText(keyLetters[i+19]).width / 2,
					pw + 5 * keySize / 2);
			} else {
				ctx.fillStyle = "rgb(25, 25, 25)";
				ctx.font = Math.floor(.35 * keySize) + "px Arial, sans-serif";
				ctx.textBaseline = "middle";
				ctx.fillText(keyLetters[i+19],
					(i + 1) * keySize + keySize / 2
						- ctx.measureText(keyLetters[i+19]).width / 2,
					pw + 5 * keySize / 2);
			}
		}

		ctx.font = Math.floor(.35 * keySize) + "px Arial, sans-serif";

		// Backtab
		ctx.strokeRect(0, pw + 2*keySize, keySize, keySize);
		if(keyHighlightTime["Backtab"] > 0) {
			fillActiveRect(0, pw + 2*keySize, keySize, keySize, ctx);
			ctx.fillStyle = "rgb(25, 25, 25)";
			ctx.font = Math.floor(.6 * keySize) + "px Arial, sans-serif";
			ctx.textBaseline = "middle";
			ctx.fillText(String.fromCharCode(171),
				keySize / 2
					- ctx.measureText(String.fromCharCode(171)).width / 2,
				pw + 2*keySize + keySize / 2);
		}
		else {
			ctx.fillStyle = "rgb(25, 25, 25)";
			ctx.font = Math.floor(.35 * keySize) + "px Arial, sans-serif";
			ctx.textBaseline = "middle";
			ctx.fillText(String.fromCharCode(171),
				keySize / 2
					- ctx.measureText(String.fromCharCode(171)).width / 2,
				pw + 2*keySize + keySize / 2);
		}

		// Tab
		ctx.strokeRect(9*keySize, pw + 2*keySize, keySize, keySize);
		if(keyHighlightTime["Tab"] > 0) {
			fillActiveRect(9*keySize, pw + 2*keySize, keySize, keySize, ctx);
			ctx.fillStyle = "rgb(25, 25, 25)";
			ctx.font = Math.floor(.6 * keySize) + "px Arial, sans-serif";
			ctx.textBaseline = "middle";
			ctx.fillText(String.fromCharCode(187),
				9*keySize + keySize / 2
					- ctx.measureText(String.fromCharCode(187)).width / 2,
				pw + 2*keySize + keySize / 2);
		}
		else {
			ctx.fillStyle = "rgb(25, 25, 25)";
			ctx.font = Math.floor(.35 * keySize) + "px Arial, sans-serif";
			ctx.textBaseline = "middle";
			ctx.fillText(String.fromCharCode(187),
				9*keySize + keySize / 2
					- ctx.measureText(String.fromCharCode(187)).width / 2,
				pw + 2*keySize + keySize / 2);
		}

		ctx.strokeRect(0, pw + 3*keySize, 2.5*squareSize, keySize);
		if(keyHighlightTime["Backspace"] > 0) {
			fillActiveRect(0, pw + 3*keySize, 2.5*squareSize, keySize, ctx);
			ctx.fillStyle = "rgb(25, 25, 25)";
			ctx.font = Math.floor(.6 * keySize) + "px Arial, sans-serif";
			ctx.textBaseline = "middle";
			ctx.fillText("BKSP",
				(keySize + squareSize) / 2
					- ctx.measureText("BKSP").width/ 2,
				pw + 3*keySize + keySize / 2);
		} else {
			ctx.fillStyle = "rgb(25, 25, 25)";
			ctx.font = Math.floor(.35 * keySize) + "px Arial, sans-serif";
			ctx.textBaseline = "middle";
			ctx.fillText("BKSP",
				(keySize + squareSize) / 2
					- ctx.measureText("BKSP").width/ 2,
				pw + 3*keySize + keySize / 2);
		}

		ctx.strokeRect(2.5*squareSize, pw + 3*keySize, 3*squareSize, keySize);
		if(keyHighlightTime["Delete"] > 0) {
			fillActiveRect(2.5*squareSize, pw + 3*keySize, 3*squareSize, keySize, ctx);
			ctx.fillStyle = "rgb(25, 25, 25)";
			ctx.font = Math.floor(.6 * keySize) + "px Arial, sans-serif";
			ctx.textBaseline = "middle";
			ctx.fillText("DEL",
				(keySize + squareSize) +
				(keySize + keySize) / 2
					- ctx.measureText("DEL").width / 2,
				pw + 3 * keySize + keySize / 2);
		} else {
			ctx.fillStyle = "rgb(25, 25, 25)";
			ctx.font = Math.floor(.35 * keySize) + "px Arial, sans-serif";
			ctx.textBaseline = "middle";
			ctx.fillText("DEL",
				(keySize + squareSize) +
				(keySize + keySize) / 2
					- ctx.measureText("DEL").width / 2,
				pw + 3 * keySize + keySize / 2);
		}

		// Up
		ctx.strokeRect(8*keySize, pw + 2*keySize, keySize, keySize);
		if(keyHighlightTime["Up"] > 0) {
			fillActiveRect(8*keySize, pw + 2*keySize, keySize, keySize, ctx);
			ctx.fillStyle = "rgb(25, 25, 25)";
			ctx.font = Math.floor(.6 * keySize) + "px Arial, sans-serif";
			ctx.textBaseline = "middle";
			ctx.fillText(String.fromCharCode(8593),
				8.5 * keySize
					- ctx.measureText(String.fromCharCode(8593)).width / 2,
				pw + 2.5 * keySize);
		} else {
			ctx.fillStyle = "rgb(25, 25, 25)";
			ctx.font = Math.floor(.35 * keySize) + "px Arial, sans-serif";
			ctx.textBaseline = "middle";
			ctx.fillText(String.fromCharCode(8593),
				8.5 * keySize
					- ctx.measureText(String.fromCharCode(8593)).width / 2,
				pw + 2.5 * keySize);
		}

		// Left
		ctx.strokeRect(10.5*squareSize, pw + 3*keySize, keySize, keySize);
		if(keyHighlightTime["Left"] > 0) {
			fillActiveRect(10.5*squareSize, pw + 3*keySize, keySize, keySize, ctx);
			ctx.fillStyle = "rgb(25, 25, 25)";
			ctx.font = Math.floor(.6 * keySize) + "px Arial, sans-serif";
			ctx.textBaseline = "middle";
			ctx.fillText(String.fromCharCode(8592),
				7.5*keySize
					- ctx.measureText(String.fromCharCode(8592)).width / 2,
				pw + 3.5 * keySize);
		} else {
			ctx.fillStyle = "rgb(25, 25, 25)";
			ctx.font = Math.floor(.35 * keySize) + "px Arial, sans-serif";
			ctx.textBaseline = "middle";
			ctx.fillText(String.fromCharCode(8592),
				7.5*keySize
					- ctx.measureText(String.fromCharCode(8592)).width / 2,
				pw + 3.5 * keySize);
		}

		// Down
		ctx.strokeRect(10.5*squareSize + keySize, pw + 3*keySize, keySize, keySize);
		if(keyHighlightTime["Down"] > 0) {
			fillActiveRect(10.5*squareSize + keySize, pw + 3*keySize, keySize, keySize, ctx);
			ctx.fillStyle = "rgb(25, 25, 25)";
			ctx.font = Math.floor(.6 * keySize) + "px Arial, sans-serif";
			ctx.textBaseline = "middle";
			ctx.fillText(String.fromCharCode(8595),
				8.5*keySize
					- ctx.measureText(String.fromCharCode(8595)).width / 2,
				pw + 3.5 * keySize);
		}
		else {
			ctx.fillStyle = "rgb(25, 25, 25)";
			ctx.font = Math.floor(.35 * keySize) + "px Arial, sans-serif";
			ctx.textBaseline = "middle";
			ctx.fillText(String.fromCharCode(8595),
				8.5*keySize
					- ctx.measureText(String.fromCharCode(8595)).width / 2,
				pw + 3.5 * keySize);
		}

		// Right
		ctx.strokeRect(10.5*squareSize + 2*keySize, pw + 3*keySize, keySize, keySize);
		if(keyHighlightTime["Right"] > 0) {
			fillActiveRect(10.5*squareSize + 2*keySize, pw + 3*keySize, keySize, keySize, ctx);
			ctx.fillStyle = "rgb(25, 25, 25)";
			ctx.font = Math.floor(.6 * keySize) + "px Arial, sans-serif";
			ctx.textBaseline = "middle";
			ctx.fillText(String.fromCharCode(8594),
				9.5*keySize
					- ctx.measureText(String.fromCharCode(8594)).width / 2,
				pw + 3.5 * keySize);
		} else {
			ctx.fillStyle = "rgb(25, 25, 25)";
			ctx.font = Math.floor(.35 * keySize) + "px Arial, sans-serif";
			ctx.textBaseline = "middle";
			ctx.fillText(String.fromCharCode(8594),
				9.5*keySize
					- ctx.measureText(String.fromCharCode(8594)).width / 2,
				pw + 3.5 * keySize);
		}

		// Space
		ctx.strokeRect(5.5*squareSize, pw + 3*keySize, 5*squareSize, keySize);
		if(keyHighlightTime["Space"] > 0) {
			fillActiveRect(5.5*squareSize, pw + 3*keySize, 5*squareSize, keySize, ctx);
		}
	};
	
	/**
	 * @description Determines if all of the cells in the puzzle have been correctly entered.
	 * @returns {boolean}
	 */
	var isComplete = Cruciverb.prototype.isComplete = function(){
		for(var i = 0; i < answerArray.length; i++)
		{
			if(answerArray[i] != enteredArray[i])
				return false;
		}
		
		return true;
	};
	
	// A few getter and setter methods for internal variables.
	var getHighlightStart = Cruciverb.prototype.getHighlightStart = function(){
		return highlightStart;	
	};
	
	var setHighlightStart = Cruciverb.prototype.setHighlightStart = function(n){
		highlightStart = n;
	};
	
	var getHighlightEnd = Cruciverb.prototype.getHighlightEnd = function(){
		return highlightEnd;
	};
	
	var setHighlightEnd = Cruciverb.prototype.setHighlightEnd = function(n){
		highlightEnd = n;
	};

	var getPlayerSquarePos = Cruciverb.prototype.getPlayerSquarePos = function(){
		 return playerSquarePos;
	};
	
	var setPlayerSquarePos = Cruciverb.prototype.setPlayerSquarePos = function(p){
		playerSquarePos = p;
		renderScreen();
	};
	
	/**
	* @description Determines the number of total squares in the current highlighted part of the puzzle.
	*/
	var getHighlightLength = Cruciverb.prototype.getHighlightLength = function(){
		return direction === "horizontal" ? (highlightEnd - highlightStart + 1) : (highlightEnd - highlightStart + 1) / 15;
	};

	/**
	 * @description Erases board and resets the web storage values.
	 */
	var clearBoard = Cruciverb.prototype.clearBoard = function(){
		for(var i = 0; i < enteredArray.length; i++)
		{
			if(enteredArray[i] != "_")
			{
				enteredArray[i] = "";
				localStorage.setItem(prefix + "enteredArray[" + i + "]", "");
			}
		}
		
		initializeCruciverb({});
	};
	
	/**
	 * @description Fill the board with the correct answers.
	 */
	var showAllAnswers = Cruciverb.prototype.showAllAnswers = function(){
		for(var i = 0; i < answerArray.length; i++)
		{
			enteredArray[i] = answerArray[i];
			renderScreen();
		}
	};
	
	/**
	 * @description Creates DOM elements that make up the ending screen.
	 */
	var createResults = function(){
		var shadowDiv = document.createElement("DIV");
		var div = document.createElement("DIV");
		var h2 = document.createElement("H2");
		var tn = document.createTextNode("Puzzle Completed");
		var tn2 = document.createTextNode("&times;");

		shadowDiv.id = "shadow_div";
		div.id = "results_div";
 
		h2.appendChild(tn);
		div.appendChild(h2);

		shadowDiv.style.width = "100%";
		shadowDiv.style.height = document.documentElement.clientHeight + "px";
		shadowDiv.style.position = "fixed";
		shadowDiv.style.top = "0";
		shadowDiv.style.left = "0";
		shadowDiv.style.backgroundColor = "rgba(80, 80, 80, 0.3)";
		
		div.style.height = "320px";
		div.style.backgroundColor = "rgba(40, 40, 40, 0.8)";
		h2.style.backgroundColor = "transparent";
		h2.style.width = "90%";
		h2.style.color = "white";
		h2.style.padding = "0 5px";
		div.style.color = "white";
		div.style.position = "absolute";
		
		if(document.documentElement.clientWidth <= 400) {
			div.style.width = "100%";
			div.style.top = "40px";
			div.style.left = "0";
		} else {
			div.style.width = "300px";
			div.style.top = "40px";
			div.style.left = "40px";
		}
		
		div.style.margin = "0 auto";
		
		hostElm.appendChild(shadowDiv);
		hostElm.appendChild(div);
	};

	/**
	 * @description Shows the ending screen.
	 */
	var showResults = Cruciverb.prototype.showResults = function() {
		resultsShown = true;
		var results = document.getElementById("results_div");

		if(results.innerHTML.indexOf("Check") === -1) {
			results.innerHTML += "<br/><br/>&nbsp;Check out more of our puzzles online!<br/><br/><br/>&nbsp;<strong><a href='" + linkHref + "' style='color: white; text-decoration: none;'>" + linkName +
		"</a></strong><br/><br/><br/><br/>&nbsp;<small>JS crossword library by timlongcreative.com</small>";
		} else {
			results.innerHTML += "<br/><br/><br/>&nbsp;&nbsp;&nbsp;Well done!";
		}

		document.getElementById("shadow_div").style.display = "block";
		results.style.display = "block";
	};
	
	/**
	 * @description Displays page in fullscreen mode.
	 */
	Cruciverb.prototype.enterFullScreen = function(elm) {
		if(typeof elm === "undefined") {
			elm = document.documentElement;
		}

		if(elm.requestFullscreen)
		{
			elm.requestFullscreen();
		}
		else
		if(elm.mozRequestFullScreen)
		{
			elm.mozRequestFullScreen();
		}
		else
		if(elm.webkitRequestFullscreen)
		{
			elm.webkitRequestFullscreen();
		}
		else
		if(elm.msRequestFullscreen)
		{
			elm.msRequestFullscreen();
		}
	};

	/**
	 * @description Leaves fullscreen mode.
	 */
	Cruciverb.prototype.exitFullScreen = function(){
		if(document.exitFullscreen)
		{
			document.exitFullscreen();
		}
		else
		if(document.mozCancelFullScreen)
		{
			document.mozCancelFullScreen();
		}
		else
		if(document.webkitExitFullscreen)
		{
			document.webkitExitFullscreen();
		}
		else
		if(document.msExitFullscreen)
		{
			document.msExitFullscreen();
		}
	};

	// Expose the constructor
	return Cruciverb;
}());