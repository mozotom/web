// <!-- Author: Tomasz Mozolewski @2014 -->
// <!-- https://github.com/mozotom/web/tree/master/ThreadDumpAnalyzer -->

var allTests = [testEmpty, testSame, testTwoGroups, testFakeGroups, testManyGroups];

function exec() {
  document.getElementById("output").value = getStringGroups(document.getElementById("input").value.split("\n")).join("\n");
}

function runAllTests() {
  var r = "<pre>";
  for (var i in allTests) { 
    r += allTests[i]() + "\n";
  }
  r += "</pre>";
  document.getElementById("results").innerHTML = r;
}

function verify(name, expected, actuals) {
  if (JSON.stringify(expected) == JSON.stringify(actuals)) {
    return "OK: " + name;
  } else {
    return "ERROR: " + name + " - expected: " + JSON.stringify(expected) + ", got: " + JSON.stringify(actuals);
  }
}

function testEmpty() {
  var expected = [];
  var actuals = getStringGroups([]);
  return verify("testEmpty", expected, actuals);
}

function testSame() {
  var expected = ["abcd"];
  var input = Array.apply(null, new Array(10)).map(function(){return "abcd"});
  var actuals = getStringGroups(input);
  return verify("testSame", expected, actuals);
}

function testTwoGroups() {
  var expected = ["abcd", "1234"];
  var input1 = Array.apply(null, new Array(10)).map(function(){return "1234"});
  var input2 = Array.apply(null, new Array(11)).map(function(){return "abcd"});
  var input = input1.concat(input2);
  var actuals = getStringGroups(input);
  return verify("testTwoGroups", expected, actuals);
}

function testFakeGroups() {
  var expected = ["1234"];
  var input1 = Array.apply(null, new Array(10)).map(function(){return "1234"});
  var input2 = Array.apply(null, new Array(2)).map(function(){return "abcd"});
  var input = input1.concat(input2);
  var actuals = getStringGroups(input);
  return verify("testFakeGroups", expected, actuals);
}

function testManyGroups() {
  var expected = ["aaaa", "bbbb", "cccc", "dddd", "eeee", "ffff", "gggg", "hhhh"];
  var input = [];
  for (var i in expected) {
    input = input.concat(Array.apply(null, new Array(10)).map(function(){return expected[i]}));
  }
  var actuals = getStringGroups(input);
  expected.sort(); 
  actuals.sort();
  return verify("testManyGroups", expected, actuals);
}
