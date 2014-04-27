// <!-- Author: Tomasz Mozolewski @2014 -->
// <!-- https://github.com/mozotom/web/tree/master/ThreadDumpAnalyzer -->

var result;
var actionEvent = "onclick";
var idN = 0;

function getId() {
  return "id" + (++idN);
}

function analyze() {
  var file = document.getElementById("st").value;
  var threadName = document.getElementById("threadName").value || ".*"; 
  var className = document.getElementById("className").value || ".*";
  
  result = processStackTraces(file, threadName, className);
  refreshResult();
}

function refreshResult() {
  document.getElementById("result").innerHTML = prettyResult(result);
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
  
  r += "<tr class=\"initial-call\" onclick=\"showCallTree('" + callLineE + "', '" + threadNamesE + "', '" + containerId + "', " + step + ", '" + parentsE + "')\"><td>" + threadNames.length + ":</td><td>" + call + "</td></tr>";

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
  parents.push(call);
  
  for (var k in threadNames) {
    var calls = stacks[threadNames[k]];
    var i = calls.indexOf(call) + step;
    if ((i >= 0) && (i<calls.length)) {
      if (parents.indexOf(calls[i]) == -1) {
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
    r += "<tr><td><table id=" + id + "><tr onclick=\"showCallTree('" + escape(stepCall) + "', '" + escape(stepCalls[stepCall].join('\n')) + "', '" + id + "', " + step + ", '" + escape(parents) + "')\"><td>" + threadCount + ":</td><td>" + stepCall + "</td></tr></table></td></tr>"
  }
  
  return r;
}

function showThread(threadNameE, callsStrE) {
  var n = 20;
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
    var displayNames = threadNames.length>n+1?threadNames.slice(0, n).join("\n") + "\n+ " + (threadNames.length - n) + " threads...":threadNames.join("\n")
	r += "<tr class=\"classes\"><td title='" + displayNames + "' style=\"color: " + c + "\">" + calls[i] + "</td></tr>";
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
  var sortedKeys = result["sortedKeys"];
  
  var r = "<table>";
  r += "<tr class=\"global-summary\"><td>### Total number of threads: " + Object.keys(stacks).length + "</td></tr>";
  for (var k in sortedKeys) {
    var callsStr = sortedKeys[k];
    var names = Object.keys(stackParts[callsStr]);
    names.sort;
    var calls = callsStr.split(",");
	r += "<tr class=\"section-summary\"><td># StackTrace length: " + calls.length + ", Number of threads: " + names.length + "</td></tr>";
	for (var i in calls) {
	  r += "<tr class=\"classes\"><td " + actionEvent + "=\"showCallTree('" + escape(calls[i]) + "', '" + escape(names.join('\n')) + "', 'details')\">" + calls[i] + "</td></tr>";
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

function processStackTraces(file, threadName, className) {
  var stacks = {};
  var callFreq = {};
  var maxCallFreq = 1;
  
  // Read file into stacks[name] = stack array
  var lines = file.split("\n");
  while (lines.length > 0) {
    var line = lines.shift();
    if (line.match(/^"/)) {
      var name = line;
      line = lines.shift();
      if (line.match(/java.lang.Thread.State:/)) {
        name += ' | ' + line;
        line = lines.shift();
      }
      
      var calls = [];
      while ((lines.length > 0) && (line != "")) {
        if (isStackLine(line) && line.match(className)) {
          var stLine = cleanStackLine(line);
          calls.push(stLine);
          if (name.match(threadName)) {
	        if (!(callFreq[stLine])) {
	          callFreq[stLine] = {};
	        }
	        callFreq[stLine][name] = true;
	        maxCallFreq = Math.max(maxCallFreq, Object.keys(callFreq[stLine]).length); 
	      }
        }
        line = lines.shift();
      }
      
      if ((calls.length > 0) && (name.match(threadName))) {
        stacks[name] = calls;
      }
    }
  }

  // Generate all stack parts
  var stackParts = {};
  for (var name in stacks) {
    var calls = stacks[name];
    for (var i0=0; i0<calls.length; ++i0) {
      for (var i1=i0; i1<calls.length; ++i1) {
        var key = calls.slice(i0, i1+1);
        if (!(stackParts[key])) {
          stackParts[key] = {};
        }
        stackParts[key][name] = true
      }
    }
  }

  // Sort from most often occurring to least
  var keys = Object.keys(stackParts);
  keys.sort(function (a, b) { return (Object.keys(stackParts[a]).length * 1000 + a.split(",").length) - (Object.keys(stackParts[b]).length * 1000 + b.split(",").length); });
  keys.reverse();

  // Map sets of threads to trace parts
  var threadsToTraceParts = {};
  for (var i in keys) {
     var calls = keys[i];
     var names = Object.keys(stackParts[calls]);
     if (!(threadsToTraceParts[names])) {
       threadsToTraceParts[names] = [];
     }
     threadsToTraceParts[names].push(calls);
  }
  
  // Remove stack traces that appear in the same sets of threads and are nested in longer trace
  for (var names in threadsToTraceParts) {
    var callsSets = threadsToTraceParts[names];
    if (callsSets.length > 1) {
      callsSets.sort(function (a, b) { return a.split(",").length - b.split(",").length });
      callsSets.reverse();
      var calls = callsSets.shift();
      while (callsSets.length > 0) {
        if (calls) {
          var i = 0;
          while (i < callsSets.length) {
	        if ((callsSets[i]) && (isPartOf(callsSets[i].split(","), calls.split(",")))) {
	          delete stackParts[callsSets[i]];
	          delete keys[keys.indexOf(callsSets[i])];
	          delete callsSets[i];
            }
	        ++i;
	      }
	    }
	    calls = callsSets.shift();
      }
    }
  }
  
  return {"stacks": stacks, "stackParts": stackParts, "sortedKeys": keys, "callFreq": callFreq, "maxCallFreq": maxCallFreq};
}

