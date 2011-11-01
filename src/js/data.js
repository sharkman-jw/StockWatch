//------------------------------------------------------------------------------
// Local storage
//------------------------------------------------------------------------------
function saveStrToLS(key, val) {
  localStorage.setItem(key, val);
}
function getStrFromLS(key, defaultValue) {
  var val = localStorage.getItem(key);
  return val ? val : defaultValue;
}
//
function saveObjToLS(key, obj) {
  localStorage.setItem(key, JSON.stringify(obj));
}
function getObjFromLS(key, defaultValue, bindMethods) {
  var val = localStorage.getItem(key);
  if (val) {
    var obj = JSON.parse(val);
    if (bindMethods)
      bindMethods(obj);
    return obj;
  }
  return defaultValue;
}
//
function getIntFromLS(key, defaultValue) {
  var val = getStrFromLS(key, null);
  return val ? parseInt(val) : defaultValue;
}
//
function clearLocalStorage() {
  for (each in localStorage)
    localStorage.removeItem(each);
}
//
function clearStockData() {
  var n = 0;
  var dataKeyPat = /^(d|rq)_(.+)$/i;
  var matchedResults = null;
  for (each in localStorage) {
    matchedResults = each.match(dataKeyPat);
    if (matchedResults) {
      localStorage.removeItem(each);
      n ++;
    }
  }
  return n;
}
//
function cleanupUnsubscribedData() {
  var subscribedSymbols = getSubscribedSymbolsHash();
  var n = 0;
  var dataKeyPat = /^(d|rq)_(.+)$/i;
  var matchedResults = null;
  for (each in localStorage) {
    matchedResults = each.match(dataKeyPat);
    if (matchedResults && !subscribedSymbols.hasOwnProperty(matchedResults[2])) {
      localStorage.removeItem(each);
      n ++;
    }
  }
  return n;
}



//------------------------------------------------------------------------------
// Data requests
//------------------------------------------------------------------------------
//var _quoteUrlLite = 'http://www.google.com/finance/info?client=ig&q=';
var _quoteUrl = 'http://www.google.com/finance/info?infotype=infoquoteall&q=';
var _hexadecimalPattern = /\\x([0-9a-f])([0-9a-f])/i;
//
function sendStockDataRequest(symbols, funcOnSuccess, funcOnFail) {
  var xhr = new XMLHttpRequest();
  var url = _quoteUrl + symbols.join(',');
  xhr.open("GET", url, true);
  log(url);
  xhr.onreadystatechange = function() {
    if(xhr.readyState == 4) {
      var good = false;
      var rawStockDataList = [];
      var text = xhr.responseText;
      if (text) {
        // try decode hexadecimal if found the sign..
        if (text.indexOf('\\x') != -1)
          text = decodeHexadecimal(text);
        // parse json data
        try {
          rawStockDataList = JSON.parse(text.substr(3));
          good = true;
        } catch (e) {
          log(e);
        }
      }
      if (good && rawStockDataList.length > 0) {
        log('data request ok');
        funcOnSuccess(rawStockDataList);
      }
      else {
        log('data request failed for: ' + symbols.join());
        if (funcOnFail)
          funcOnFail();
      }
    }
  };
  xhr.send(null);
}
//
function sendSingleStockDataRequest(symbol, funcOnSuccess, funcOnFail) {
  sendStockDataRequest([symbol], function(rawStockDataList) {
    if (rawStockDataList.length == 1)
      funcOnSuccess(rawStockDataList[0]);
    else {
      if (funcOnFail)
        funcOnFail(symbol);
    }
  }, function() {
    if (funcOnFail)
      funcOnFail(symbol);
  });
}
//
function decodeHexadecimal(text) {
  var matchedResults = null;
  var n = 0; // char numeric value
  var n1 = 0;
  var n2 = 0;
  do {
    matchedResults = text.match(_hexadecimalPattern);
    if (matchedResults) {
      n1 = matchedResults[1].toLowerCase().charCodeAt(0);
      n2 = matchedResults[2].toLowerCase().charCodeAt(0);
      n1 = n1 < 58 ? n1 - 48 : n1 - 97 + 10;
      n2 = n2 < 58 ? n2 - 48 : n2 - 97 + 10;
      n = n1 * 16 + n2;
      text = text.replace(matchedResults[0], String.fromCharCode(n));
    } else
      break;
  } while (matchedResults);
  return text;
}
//
function requestSubscriptions() {
  var symbols = getSubscribedSymbolsList();
  //console.log(symbols);
  var i = 0;
  var batch = null;
  var failedOnes = [];
  while (i < symbols.length) {
    batch = symbols.slice(i, i + 10);
    i += 10;
    sendStockDataRequest(batch, processRawStockDataList, function() {
      for (var j = 0; j < batch.length; ++ j) {
        sendSingleStockDataRequest(batch[j], processRawStockData, function(failedSymbol) {
          // TODO: figure out a way to cleanup garbage (failed/wrong symbols)
          // Maybe just display "can't retrieve data" for that stock line,
          // so user may delete it himself.
        });
      }
    });
  }
}
//
function getSubscribedSymbolsList() {
  var hash = getSubscribedSymbolsHash();
  var lst = [];
  for (each in hash) {
    lst.push(each);
  }
  return lst;
}
//
function getSubscribedSymbolsHash() {
  return getSymbolListManagerFromLS().getAllSymbolsHash();
}




//------------------------------------------------------------------------------
// Data processing
//------------------------------------------------------------------------------
function doCalculations(stock, recentQuotes, recentQuotesLimit){
  if (recentQuotes && recentQuotes.quotes.length == recentQuotesLimit) {
    // calculate trend based on moving avg
    stock.calcTrend(recentQuotes.average());
  }
  // calc stock tick based on previous cached stock data
  var previousCachedStock = getStockFromLS(stock.keyTicker, null);
  if (previousCachedStock) {
    stock.calcLastTick(previousCachedStock.effectiveLastPriceFloat());
    stock.genPriceHTML(previousCachedStock.effectiveLastPrice());
  } else {
    stock.priceHTML = stock.effectiveLastPrice();
  }
}
//
function processRawStockData(rawData) {
  var stock = new Stock(rawData);
  var recentQuotes = getRecentQuotesFromLS(stock.keyTicker);
  if (!recentQuotes)
    recentQuotes = new RecentQuotes(stock.keyTicker);
  
  var recentQuotesLimit = getIntFromLS('recent_quotes_limit', 12);
  doCalculations(stock, recentQuotes, recentQuotesLimit);    
  stock.saveToLS();
  
  recentQuotes.addQuote(stock.effectiveLastPriceFloat(), recentQuotesLimit);
  recentQuotes.saveToLS();
}
//
function processRawStockDataList(rawDataList) {
  for (var i = 0; i < rawDataList.length; ++ i)
    processRawStockData(rawDataList[i]);
}

