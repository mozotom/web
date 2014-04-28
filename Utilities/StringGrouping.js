// <!-- Author: Tomasz Mozolewski @2014 -->
// <!-- https://github.com/mozotom/web/tree/master/ThreadDumpAnalyzer -->

/**
  strList - array of strings 
  minLen - minimum length of common part
  targetGroupCount - average number of groups to return  
*/
function getStringGroups(strList, minLen, targetGroupCount) {
  minLen = minLen || 3;
  targetGroupCount = targetGroupCount || 10;
  var matchedParts = getAllMatches(strList, minLen);
  removeContainedParts(matchedParts);
  
  var strGroups = Object.keys(matchedParts);
  strGroups.sort(function(a, b) { return matchedParts[a] - matchedParts[b]; } );
  strGroups.reverse();
  
  var topCount = 1;
  while ((topCount < strGroups.length) && (matchedParts[strGroups[topCount-1]] * topCount / (topCount + targetGroupCount) <= matchedParts[strGroups[topCount]])) {
    ++topCount;
  }
  
  return strGroups.slice(0, topCount);
}

function removeContainedParts(matchedParts) {
  for (var i in matchedParts) {
    for (var j in matchedParts) {
      if (i != j) {
        if ((matchedParts[i] > matchedParts[j]) && (i.indexOf(j)>=0)) {
          delete matchedParts[j];
        } else if ((matchedParts[j] > matchedParts[i]) && (j.indexOf(i)>=0)) {
          delete matchedParts[i];
        }
      }
    }
  }
}

function getAllMatches(strList, minLen) {
  var matchedParts = {};
  for (i in strList) {
    for (j in strList) {
      if (i != j) addAllMatches(matchedParts, strList[i], strList[j], minLen);
    }
  }
  return matchedParts;
}

function addAllMatches(matchedParts, strA, strB, minLen) {
  var foundMatches = [];
  for (var i=0; i+minLen<=strA.length; ++i) {
    for (var j=minLen; i+j<=strA.length; ++j) {
      var part = strA.substr(i, j);
      if (foundMatches.indexOf(part) == -1) {
        if (strB.indexOf(part) >= 0) {
          if (matchedParts[part]) {
            matchedParts[part] += part.length / strB.length;
            foundMatches.push(part);
          } else {
            matchedParts[part] = part.length / strB.length;
            foundMatches.push(part);
          }
        }
      } 
    }
  }
}
