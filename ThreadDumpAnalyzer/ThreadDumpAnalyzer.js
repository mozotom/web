// <!-- Author: Tomasz Mozolewski @2014 -->
// <!-- https://github.com/mozotom/web/tree/master/ThreadDumpAnalyzer -->

var result = new Object();
var actionEvent = "onclick";
var autoExpand = true;
var idN = 0;
var maxThreadNamesDisplay = 10;
var updateMillis = 1000;

function getId() {
  return "id" + (++idN);
}

function analyze() {
  result.completed = "";
  updateStatus("Starting", 1, 0, 7, true, analyzeIt);
}

function analyzeIt() {
  document.getElementById("analyzeButton").style.visibility = "hidden";
  result.file = document.getElementById("st").value;
  result.threadName = document.getElementById("threadName").value || ".*"; 
  result.className = document.getElementById("className").value || ".*";
  updateStatus("Started", 1, 0, 7, false, processStackTraces);
}

function refreshResult() {
  document.getElementById("result").innerHTML = prettyResult(result);
  document.getElementById("details").innerHTML = "";
  document.getElementById("analyzeButton").style.visibility = "visible";
}

function getDisplayThreadNames(threadNames) {
  return threadNames.length>maxThreadNamesDisplay+1?threadNames.slice(0, maxThreadNamesDisplay).join("\n") + "\n+ " + (threadNames.length - maxThreadNamesDisplay) + " threads...":threadNames.join("\n");
}

function showCallTreeRoot(callLinesE, threadNamesE) {
  var threadNames = unescape(threadNamesE).split("\n");
  var callLines = unescape(callLinesE).split(",");
  var n = callLines.length;

  var r = "<table>";

  var q = getCallsRowsHTML(callLines[0], callLines.slice(1,n), threadNames, -1);
  if (q != "") {
    r += "<tr><td class=\"emptyLineV\"></td><td><table>" + q + "</table></td></tr>";
  }

  for (var i in callLines) {
    r += "<tr class=\"base-call\" title='" + getDisplayThreadNames(threadNames) + "'><td>" + threadNames.length + ":</td><td>" + callLines[i] + "</td></tr>";
  }

  var s = getCallsRowsHTML(callLines[n-1], callLines.slice(0,n-1), threadNames, 1);
  if (s != "") {
    r += "<tr><td class=\"emptyLineV\"></td><td><table>" + s + "</table></td></tr>";
  }
  
  r += "</table>";
  document.getElementById('details').innerHTML = r;
}

function showCallTree(callLineE, threadNamesE, containerId, step, parentsE) {
  var threadNames = unescape(threadNamesE).split("\n");
  if (parentsE) {
    var parents = unescape(parentsE).split(",");
  } else {
    var parents = [];
  }
  var call = unescape(callLineE);
  var r = "<table>";

  if (step != 1) {
    var q = getCallsRowsHTML(call, parents, threadNames, -1);
    if (q != "") {
      r += "<tr><td class=\"emptyLineV\"></td><td><table>" + q + "</table></td></tr>";
    }
  }
  
  r += "<tr class=\"initial-call\" title='" + getDisplayThreadNames(threadNames) + "' onclick=\"showCallTree('" + callLineE + "', '" + threadNamesE + "', '" + containerId + "', " + step + ", '" + parentsE + "')\"><td>" + threadNames.length + ":</td><td>" + call + "</td></tr>";

  if (step != -1) {
    var s = getCallsRowsHTML(call, parents, threadNames, 1);
    if (s != "") {
      r += "<tr><td class=\"emptyLineV\"></td><td><table>" + s + "</table></td></tr>";
    }
  }
  
  r += "</table>";
  document.getElementById(containerId).innerHTML = r;
}

function getCallsRowsHTML(call, parents, threadNames, step) {
  var stepCalls = {};
  var stacks = result["stacks"];
  var r = "";
  
  if (step == 1) {
    parents.push(call);
  } else {
    parents.unshift(call);
  }
  
  for (var k in threadNames) {
    var calls = stacks[threadNames[k]];
    var i = 0;
    while (i + parents.length <= calls.length) {
      if (isPartEqual(parents, calls, i) && ((step == 1) || (i>0))) {
        break;
      } else {
        ++i
      }
    }
    
    if (i + parents.length <= calls.length) {
      if (step == 1) {
        i += parents.length;
      } else {
        --i;
      }

      if ((i >= 0) && (i<calls.length)) {
        if (!(stepCalls[calls[i]])) {
          stepCalls[calls[i]] = [];
        }
        stepCalls[calls[i]].push(threadNames[k]);
      }
    }
  }
  
  var stepCallsKeys = Object.keys(stepCalls);
  stepCallsKeys.sort(function(a, b) { return (stepCalls[a].length - stepCalls[b].length) * step; });
  stepCallsKeys.reverse();
  for (var k in stepCallsKeys) {
    var stepCall = stepCallsKeys[k]
    var threadCount = stepCalls[stepCall].length;
    var id = getId();
    r += "<tr><td><table id=" + id + "><tr title='" + getDisplayThreadNames(stepCalls[stepCall]) + "' onclick=\"showCallTree('" + escape(stepCall) + "', '" + escape(stepCalls[stepCall].join('\n')) + "', '" + id + "', " + step + ", '" + escape(parents) + "')\"><td>" + threadCount + ":</td><td>" + stepCall + "</td></tr></table></td></tr>"

    if ((autoExpand) && (stepCallsKeys.length == 1)) {
      setTimeout(function() { showCallTree(escape(stepCall), escape(stepCalls[stepCall].join('\n')), id, step, escape(parents)); }, 0); 
    }
  }
  
  return r;
}

function showThread(threadNameE, callsStrE) {
  var r = "<table>";

  var threadName = unescape(threadNameE);
  var commonCalls = unescape(callsStrE).split(",");
  
  r += "<tr class=\"global-summary\"><td>" + threadName + "</td></tr>";
  
  var calls = result["stacks"][threadName];
  var callFreq = result["callFreq"];
  var maxCallFreq = result["maxCallFreq"] - 1;
  for (var i in calls) {
    var threadNames = Object.keys(callFreq[calls[i]]);
    if (commonCalls.indexOf(calls[i]) >= 0) {
      var c = "blue";
    } else {
      var c = getColor((threadNames.length - 1) / maxCallFreq);
    }

    r += "<tr class=\"classes\"><td onclick=\"showCallTreeRoot('" + escape(calls[i]) + "', '" + escape(threadNames.join('\n')) + "')\" style=\"color: " + c + "\">" + calls[i] + "</td></tr>";
  }
  
  r += "</table>";
  document.getElementById("details").innerHTML = r;
}

function getColor(v) {
  var r = Math.max(0, Math.min(255, Math.round(v * 255)));
  var g = Math.max(0, Math.min(255, Math.round(0 * 255)));
  var b = Math.max(0, Math.min(255, Math.round(0 * 255)));
  return "rgb(" + r + "," + g + "," + b + ")";
}

function prettyResult(result) {
  var stacks = result["stacks"];
  var stackParts = result["stackParts"];
  var keys = result["keys"];
  
  var r = "<table>";
  r += "<tr class=\"global-summary\"><td>### Total number of threads: " + Object.keys(stacks).length + "</td></tr>";
  for (var k in keys) {
    var callsStr = keys[k];
    var names = Object.keys(stackParts[callsStr]);
    names.sort;
    var calls = callsStr.split(",");
	r += "<tr class=\"section-summary\"><td># StackTrace length: " + calls.length + ", Number of threads: " + names.length + "</td></tr>";
	for (var i in calls) {
	  r += "<tr class=\"classes\"><td " + actionEvent + "=\"showCallTreeRoot('" + escape(calls) + "', '" + escape(names.join('\n')) + "')\">" + calls[i] + "</td></tr>";
	}
	for (var i in names) {
	  r += "<tr class=\"threads\"><td " + actionEvent + "=\"showThread('" + escape(names[i]) + "', '" + escape(callsStr) + "')\">" + names[i] + "</td></tr>";
	}
  }
  r += "</table>";
  return r;
}

function cleanStackLine(line) {
  return line.replace(/^[\t ]+at /, "").match(/^[^(]*/)[0]
}

function isStackLine(line) {
  return line.match(/^[\t ]+at /);
}

function isPartEqual(part, whole, i0) {
  for (var i=0; i<part.length; ++i) {
    if (part[i] != whole[i0+i]) {
      return false;
    }
  }
  return true;
}

function isPartOf(part, whole) {
  for (var i=0; i<=(whole.length - part.length); ++i) {
    if (isPartEqual(part, whole, i)) {
      return true;
    }
  }
  return false;
}

// message - message to show
// pStage - percent of stage completed
// iStage - stage number
// nStage - number of stages
// newLine - should new line be started after this one
// callNext - call after update
function updateStatus(message, pStage, iStage, nStage, newLine, callNext) {
  var formattedMsg = new Date().toLocaleTimeString() + " " + "[" + iStage + "/" + nStage + "] " + Math.round(pStage * 100) + "% " + message;
  document.getElementById("result").innerHTML = result.completed + formattedMsg;

  if (newLine) result.completed += formattedMsg + "<br />"; 
  if (callNext) setTimeout(callNext, 0);
}

function processStackTraces() {
  result.stacks = {};
  result.callFreq = {};
  result.maxCallFreq = 1;
  result.nextUpdate = Date.now();
  updateStatus("Initialized", 1, 1, 7, true);
  updateStatus("Reading input", 0, 2, 7, false, readFile);
}
  
// Read file into stacks[name] = stack array
function readFile() {
  result.lines = result.file.split("\n");
  result.totalLinesCount = result.lines.length;
  updateStatus("Parsing input", 0, 2, 7, false, readFileLine);
}

function readFileLine() {
  while (result.lines.length > 0) {
    var line = result.lines.shift();
    if (line.match(/^"/)) {
      var name = line;
      line = result.lines.shift();
      if (line.match(/java.lang.Thread.State:/)) {
        name += ' | ' + line;
        line = result.lines.shift();
      }
      
      var calls = [];
      while ((result.lines.length > 0) && (line != "")) {
        if (isStackLine(line) && line.match(className)) {
          var stLine = cleanStackLine(line);
          calls.push(stLine);
          if (name.match(result.threadName)) {
	        if (!(result.callFreq[stLine])) {
	          result.callFreq[stLine] = {};
	        }
	        result.callFreq[stLine][name] = true;
	        result.maxCallFreq = Math.max(result.maxCallFreq, Object.keys(result.callFreq[stLine]).length); 
	      }
        }
        line = result.lines.shift();
      }
      
      if ((calls.length > 0) && (name.match(result.threadName))) {
        result.stacks[name] = calls;
      }
    }
    if (result.nextUpdate < Date.now()) {
      result.nextUpdate = Date.now() + updateMillis;
      updateStatus("Parsing input", (result.totalLinesCount - result.lines.length) / result.totalLinesCount, 2, 7, false, readFileLine);      
      return;
    }
  }
  if (result.lines.length == 0) updateStatus("Input parsed", 1, 2, 7, true, genStackParts);
}

// Generate all stack parts
function genStackParts() {
  result.stackParts = {};
  result.iter = Object.keys(result.stacks);
  result.totalCount = result.iter.length;
  updateStatus("Generating parts", 0, 3, 7, false, genStackPartsForThread);
}

function genStackPartsForThread() {
  while (result.iter.length > 0) {
    var name = result.iter.shift(); 
    var calls = result.stacks[name];
    for (var i0=0; i0<calls.length; ++i0) {
      for (var i1=i0; i1<calls.length; ++i1) {
        var key = calls.slice(i0, i1+1);
        if (!(result.stackParts[key])) {
          result.stackParts[key] = {};
        }
        result.stackParts[key][name] = true
      }
    }
    if (result.nextUpdate < Date.now()) {
      result.nextUpdate = Date.now() + updateMillis;
      updateStatus("Generating parts", (result.totalCount - result.iter.length) / result.totalCount, 3, 7, false, genStackPartsForThread);
      return;
    }
  } 
  if (result.iter.length == 0) {
    updateStatus("Parts generated", 1, 3, 7, true);
    updateStatus("Sorting parts", 0, 4, 7, false, sortStackPartKeys);
  }
}

// Sort from most often occurring to least
function sortStackPartKeys() {
  result.keys = Object.keys(result.stackParts);
  result.keys.sort(function (a, b) { return (Object.keys(result.stackParts[a]).length * 1000 + a.split(",").length) - (Object.keys(result.stackParts[b]).length * 1000 + b.split(",").length); });
  result.keys.reverse();
  updateStatus("Parts sorted", 1, 4, 7, true, mapSetsOfThreads);
}

// Map sets of threads to trace parts
function mapSetsOfThreads() {
  result.threadsToTraceParts = {};
  result.iter = Object.keys(result.keys);
  result.totalCount = result.iter.length;
  updateStatus("Mapping threads", 0, 5, 7, false, mapSetsOfThreadsIter);
}

function mapSetsOfThreadsIter() {
  while (result.iter.length > 0) {
    var i = result.iter.shift();
    var calls = result.keys[i];
    var names = Object.keys(result.stackParts[calls]);
    if (!(result.threadsToTraceParts[names])) {
      result.threadsToTraceParts[names] = [];
    }
    result.threadsToTraceParts[names].push(calls);
    if (result.nextUpdate < Date.now()) {
      result.nextUpdate = Date.now() + updateMillis;
      updateStatus("Mapping threads", (result.totalCount - result.iter.length) / result.totalCount, 5, 7, false, mapSetsOfThreadsIter);
      return;
    }
  }
  if (result.iter.length == 0) {
    updateStatus("Mapping threads", 1, 5, 7, true, removeDuplicateNestedTraces);
  }
}

// Remove stack traces that appear in the same sets of threads and are nested in longer trace
function removeDuplicateNestedTraces() {
  result.iter = Object.keys(result.threadsToTraceParts);
  result.totalCount = result.iter.length;
  updateStatus("Removing duplicates", 0, 6, 7, false, removeDuplicateNestedTracesIter);
}

function removeDuplicateNestedTracesIter() {
  while (result.iter.length > 0) {  
    var names = result.iter.shift();
    var callsSets = result.threadsToTraceParts[names];
    if (callsSets.length > 1) {
      callsSets.sort(function (a, b) { return a.split(",").length - b.split(",").length });
      callsSets.reverse();
      var calls = callsSets.shift();
      while (callsSets.length > 0) {
        if (calls) {
          var i = 0;
          while (i < callsSets.length) {
	        if ((callsSets[i]) && (isPartOf(callsSets[i].split(","), calls.split(",")))) {
	          delete result.stackParts[callsSets[i]];
	          delete result.keys[result.keys.indexOf(callsSets[i])];
	          delete callsSets[i];
            }
	        ++i;
	      }
	    }
	    calls = callsSets.shift();
      }
    }
    if (result.nextUpdate < Date.now()) {
      result.nextUpdate = Date.now() + updateMillis;
      updateStatus("Removing duplicates", (result.totalCount - result.iter.length) / result.totalCount, 6, 7, false, removeDuplicateNestedTracesIter);
      return;
    }
  }
  if (result.iter.length == 0) {  
    updateStatus("Duplicates removed", 1, 6, 7, true);
    updateStatus("Analysis completed, generating page...", 0, 0, 7, false, refreshResult);
  }
}
