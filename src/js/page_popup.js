// TODO:
// star/highlight line

//------------------------------------------------------------------------------
// Page global data
//------------------------------------------------------------------------------
var _slm = null; // symbol list manager
var _pm = null; // position manager
var _currentList = null;
var _recentList = null;
var _stocksData = null; // cache stock data locally for performance
var _currentMouseOverLine = null;
var _refreshRetryTimeout = 1000;
var _msgCounter = 0;
var _startup = 1;
var _userTyping = false;
var _rposInRecent = 0;
var _midPanelVisible = false;
var _topPanelVisible = null;
var _topPanelContent = ''; // 'd' (details), 's' (suggestions) or ''
var _disableSuggestions = false;
var _currSuggestion = -1;
var _suggestionLines = [];
var _tooltipTimer = null;
var _listPanelTrailingLineCreated = false;

var YAHOO = { Finance: { SymbolSuggest: {} } };
YAHOO.Finance.SymbolSuggest.ssCallback = processSymbolSuggestResult;

//------------------------------------------------------------------------------
// Init & Exit
//------------------------------------------------------------------------------
function onPopupLoad() {
  jQuery('#symbol_input').focus();
  
  initLocalData();
  initDetailPanel();
  resetListPanelFooter();
  
  refreshAll();
  var config = getConfig('data_refresh_interval');
  var interval = 1000 * (config ? config.getValue() : 10);
  setInterval('refreshAll()', interval);
}
function initLocalData() {
  _slm = getSymbolListManagerFromLS();
  _pm = getPositionManagerFromLS();
  _recentList = _slm.getListById('sl_recent');
  _recentList.setEnable(true);
  _currentList = _slm.getCurrentList();
  _stocksData = {};
  _currentMouseOverLine = '';
  _currSuggestion = -1;
  _suggestionLines = [];
  
  _msgCounter = 0;
  _startup = 1;
  _userTyping = false;
  _midPanelVisible = false;
  _topPanelVisible = null;
  _topPanelContent = '';
  var config = getConfig('enable_suggestions');
  _disableSuggestions = !config || !config.getValue();
}
function onPopupUnload() {
  cleanupUnsubscribedData();
  cleanupGarbageAlerts();
  _recentList.setEnable(false); // this must be after cleanup, otherwise it will wipe out recent symbols
}



//------------------------------------------------------------------------------
// Page-wide functions
//------------------------------------------------------------------------------
function refreshAll() {
  if (!reloadStockData()) {
    // loading data failed, retry later
    setTimeout(refreshAll, _refreshRetryTimeout);
    _refreshRetryTimeout *= 1.618; // increase timeout
  } else {
    refreshListPanel();
    refreshDetailPanel(false);
    refreshTickHighlights();
    _refreshRetryTimeout = 1000; // reset retry timeout
  }
}
//
function refreshTickHighlights() {
  var stock = null;
  var node = null;
  // list panel
  if (_currentList) {
    for (var i = 0; i < _currentList.size(); ++ i) {
      node = jQuery('#' + _currentList.listId + '_' + i + ' .col_prc span');
      stock = _stocksData[_currentList.at(i)];
      if (stock) {
        if (stock.lastTick == 'u')
          node.addClass('tick_g');
        else if (stock.lastTick == 'd')
          node.addClass('tick_r');
      }
    }
  }
  // detail panel
  var keyTicker = getStrFromLS('detail_panel_stock', '');
  if (keyTicker) {
    stock = _stocksData[keyTicker];
    node = jQuery('#detail_prc span');
    if (stock) {
      if (stock.lastTick == 'u')
        node.addClass('tick_g');
      else if (stock.lastTick == 'd')
        node.addClass('tick_r');
    }
  }
  // schedule clear
  window.setTimeout(clearTickHighlights, 888);
}
//
function clearTickHighlights() {
  var node = null;
  // list panel
  if (_currentList) {
    for (var i = 0; i < _currentList.size(); ++ i) {
      node = jQuery('#' + _currentList.listId + '_' + i + ' .col_prc span');
      if (node) {
        node.removeClass('tick_g');
        node.removeClass('tick_r');
      }
    }
  }
  // detail panel
  node = jQuery('#detail_prc span');
  if (node) {
    node.removeClass('tick_g');
    node.removeClass('tick_r');
  }
}
//
function reloadStockData() {
  // load all subscribed data from local storage (db) to local hash
  var subs = getSubscribedSymbolsHash();
  var stock = null;
  var toRequest = [];
  for (keyTicker in subs) {
    stock = getStockFromLS(keyTicker);
    if (stock)
      _stocksData[keyTicker] = stock;
    else {
      _stocksData[keyTicker] = null;
      toRequest.push(keyTicker); // save unfound ticker to request later
      track('Couldn\'t load stock: ' + keyTicker);
    }
  }
  // request unfound tickers
  if (toRequest.length > 0) {
    // request the whole group
    sendStockDataRequest(toRequest, function(rawDataList) {
      for (var i = 0; i < rawDataList.length; ++ i)
        createStockAndSave(rawDataList[i]);;
    }, function() { // if group request failed, request each of them
      for (var i = 0; i < toRequest.length; i ++) {
        sendSingleStockDataRequest(toRequest[i], createStockAndSave, function(failedSymbol) {
          // TODO: figure out a way to cleanup garbage (failed/wrong symbols)
        });
      }
    });
  }
  return true;
}
//
function createListLine(keyTicker, stock, indexInList, listId) {
  if (!stock)
    return null;
  
  var lineNode = document.createElement('div');
  var lineNodeId = listId + '_' + indexInList;
  lineNode.setAttribute('class', 'quote_line');
  lineNode.setAttribute('id', lineNodeId);
  lineNode.setAttribute('onmouseover', "onMouseOverListLine(this.id)");
  lineNode.setAttribute('onmouseout', "onMouseOutListLine(this.id)");
  
  var onClickScript = "onClickListLine('" + stock.keyTicker + "');";
  
  // ticker column
  var colNode = createListLineTickerColumn(stock, true, true);
  if (!colNode)
    return null;
  colNode.setAttribute('onclick', onClickScript);
  lineNode.appendChild(colNode);
  
  // price column
  colNode = createListLinePriceColumn(stock);
  if (!colNode)
    return null;
  colNode.setAttribute('onclick', onClickScript);
  lineNode.appendChild(colNode);
  
  // trend column
  colNode = document.createElement('div');
  colNode.setAttribute('class', 'col_trend');
  if (stock.trend) {
    colNode.innerHTML = stock.trend;
  }
  colNode.setAttribute('onclick', onClickScript);
  lineNode.appendChild(colNode);
  
  // changes columns (value change & percentage change)
  colNode = document.createElement('div');
  var colNode2 = document.createElement('div');
  var priceChangeDisp = stock.effectiveChange();
  var priceChange = parseFloat(priceChangeDisp);
  if (Math.abs(priceChange) < 0.0001) { // no change
    colNode.setAttribute('class', 'col_c');
    colNode2.setAttribute('class', 'col_cp');
  }
  else if (priceChange < 0.0) { // lose
    colNode.setAttribute('class', 'col_c price_r');
    colNode2.setAttribute('class', 'col_cp price_r');
  }
  else { // gain
    colNode.setAttribute('class', 'col_c price_g');
    colNode2.setAttribute('class', 'col_cp price_g');
  }
  colNode.setAttribute('onclick', onClickScript);
  colNode2.setAttribute('onclick', onClickScript);
  colNode.innerHTML = priceChangeDisp;
  colNode2.innerHTML = stock.effectivePercentChange() + '%';
  lineNode.appendChild(colNode);
  lineNode.appendChild(colNode2);
  
  // actions column
  colNode = createActionColumn(stock.keyTicker, stock, listId, lineNodeId);
  if (!colNode)
    return null;
  lineNode.appendChild(colNode);
  
  return lineNode;
}
//
function createActionColumn(keyTicker, stock, listId, lineId) {
  var col = document.createElement('div');
  col.setAttribute('class', (_currentMouseOverLine == lineId ? 'col_act' : 'col_act no_display'));
  if (listId == 'sl_recent') {
  } else if (listId == 'sl_portfolio') {
    // del
    col.appendChild(createDelButton("removePosition('" + keyTicker + "')"));
  } else {
    // del
    col.appendChild(createDelButton("toggleStockInList('" + keyTicker + "','" + listId + "')"));
    // move
    col.appendChild(createMoveButton(keyTicker));
  }
  return col;
}
//
function createListLineTickerColumn(stock, includingStatus, includingExchange) {
  var colNode = document.createElement('div');
  
  // symbol
  if (stock) {
    var symbolNode = document.createElement('a');
    symbolNode.setAttribute('target', '_blank');
    symbolNode.setAttribute('href', stock.url());
    symbolNode.innerHTML = stock.ticker;
    colNode.appendChild(symbolNode);
  }
  
  colNode.setAttribute('class', 'col_t ' + (includingStatus || includingExchange ? 'long_ticker_col' : 'short_ticker_col'));
  
  if (includingStatus && stock && stock.status) {
    var statusNode = document.createElement('span');
    statusNode.setAttribute('class', 'status');
    statusNode.innerHTML = stock.status;
    colNode.appendChild(statusNode);
  }
  
  if (includingExchange && stock) {
    var exchange = '';
    if (stock.exchange != 'NYSE' && stock.exchange != 'NASDAQ' && stock.exchange != 'AMEX') {
      if (stock.exchange.indexOf('INDEX') != -1) // indices
        exchange = 'INDEX';
      else // non-us exchanges
        exchange = stock.exchange;
    }
    if (exchange) {
      var exchangeNode = document.createElement('span');
      exchangeNode.setAttribute('class', 'exchange');
      exchangeNode.innerHTML = exchange;
      colNode.appendChild(exchangeNode);
    }
  }
  
  return colNode;
}
//
function createListLinePriceColumn(stock, price) {
  // price
  var col = document.createElement('div');
  col.setAttribute('class', 'col_prc');
  if (price)
    col.innerHTML = price;
  else if (stock)
    col.innerHTML = stock.priceHTML ? stock.priceHTML : stock.effectiveLastPrice();
  return col;
}
//
function onClickListLine(keyTicker) {
  _topPanelContent = ''; // hack
  _userTyping = false;
  setDetailPanelStock(keyTicker, true);
}
//
function onMouseOverListLine(lineId) {
  var lineNode = jQuery('#' + lineId);
  // update global state of current mouseover line
  _currentMouseOverLine = lineId;
  // line highlight
  //if (!lineNode.hasClass('highlight_g') || !lineNode.hasClass('highlight_r'))
  //  lineNode.addClass('mouseover_highlight');
  // show action buttons
  jQuery('#' + lineId + ' .col_act').show();
}
//
function onMouseOutListLine(lineId) {
  _currentMouseOverLine = '';
  //jQuery('#' + lineId).removeClass('mouseover_highlight');
  jQuery('#' + lineId + ' .col_act').hide();
}
//
function createDelButton(onClickScript) {
  var btnNode = document.createElement('img');
  btnNode.setAttribute('class', 'act act_del left');
  btnNode.setAttribute('onclick', onClickScript);
  btnNode.setAttribute('src', 'images/del.png');
  return btnNode;
}
//
function createMoveButton(keyTicker) {
  // move
  var btnNode = document.createElement('div');
  btnNode.setAttribute('class', 'act act_move left');
  // up
  var upNode = document.createElement('a');
  upNode.setAttribute('href', '#');
  upNode.setAttribute('class', 'move_up');
  upNode.setAttribute('onclick', "moveWatchStockUp('" + keyTicker + "');");
  btnNode.appendChild(upNode);
  // down
  var downNode = document.createElement('a');
  downNode.setAttribute('href', '#');
  downNode.setAttribute('class', 'move_down');
  downNode.setAttribute('onclick', "moveWatchStockDown('" + keyTicker + "');");
  btnNode.appendChild(downNode);
  return btnNode;
}



//------------------------------------------------------------------------------
// Detail panel (including ticker input box)
//------------------------------------------------------------------------------
function initDetailPanel() {
  var config = getConfig('detail_panel_startup');
  if (config && config.valIndex == 1) { // show icon stock
    setDetailPanelStock(getStrFromLS('icon_stock', ''), false);
  } else if (config && config.valIndex == 2) { // show last stock
  }
  else {
    setDetailPanelStock('', false);
  }
}
//
function setupTopPanel(contentType, force) {
  if (contentType == 'd') { // details
    // show top panel
    if (!_topPanelVisible)
      jQuery('#top_panel').show('fast');
    _topPanelVisible = true;
    if (_topPanelContent == 's' && !force)
      return; // skip if currently displaying suggestions
    // hide suggestions
    jQuery('#suggestions').hide();
    // show details
    showStockDetails(true);
  } else if (contentType == 's') { // suggestions
    // hide details
    setDetailPanelStock('', false);
    showStockDetails(false);
    // show top panel
    if (!_topPanelVisible)
      jQuery('#top_panel').show('fast');
    _topPanelVisible = true;
    // show suggestions
    jQuery('#suggestions').show();
  } else { // hide
    setDetailPanelStock('', false);
    // skip if suggestions are on
    if (_topPanelContent == 's' && !force)
      return;
    if (_topPanelVisible != false)
      jQuery('#top_panel').hide('slow');
    // hide details
    showStockDetails(false);
    _topPanelVisible = false;
  }
  _topPanelContent = contentType;
}
//
function showStockDetails(showNotHide) {
  if (showNotHide) {
    jQuery('#detail_name_container').show();
    jQuery('#details').show();
  } else {
    jQuery('#detail_name_container').hide();
    jQuery('#details').hide();
    if (!_userTyping)
      jQuery('#symbol_input').val('');
  }
}
//
function setDetailPanelStock(keyTicker, applyImmediately) {
  saveStrToLS('detail_panel_stock', keyTicker);
  if (applyImmediately)
    refreshDetailPanel(true);
}
//
function refreshDetailPanel(completely) {
  var keyTicker = getStrFromLS('detail_panel_stock', '');
  var showNotHide = false;
  if (keyTicker) {
    var stock = _stocksData[keyTicker] || getStockFromLS(keyTicker);
    if (stock) {
      updateDetailPanelQuoteLine(stock);
      if (completely)
        buildDetailPanelActions(stock);
      updateDetailPanelOther(stock);
      showNotHide = true;
    }
  }
  setupTopPanel(showNotHide ? 'd' : '');
}
//
function updateDetailPanelQuoteLine(stock) {
  // price
  jQuery('#detail_prc').html(stock.priceHTML);
  // change and change percentage
  var percentage = parseFloat(stock.effectivePercentChange());
  var node1 = document.createElement('span');
  var node2 = document.createElement('span');
  if (Math.abs(percentage) < 0.0001) { // no change
  } else if (percentage < 0.0) { // lose
    node1.setAttribute('class', 'price_r');
    node2.setAttribute('class', 'price_r');
  } else { // gain
    node1.setAttribute('class', 'price_g');
    node2.setAttribute('class', 'price_g');
  }
  node1.innerHTML = stock.effectiveChange();
  node2.innerHTML = '(' + percentage + '%)';
  var node = jQuery('#detail_c');
  node.empty();
  node.append(node1);
  node = jQuery('#detail_cp');
  node.empty();
  node.append(node2);
  // status
  node = jQuery('#detail_status');
  if (stock.status) {
    node.show();
    node.text(stock.status);
  } else {
    node.hide();
  }
}
//
function buildDetailPanelActions(stock) {
  var actsNode = jQuery('#detail_acts');
  actsNode.empty();
  
  if (!_currentList || !stock)
    return;
  
  var underWatch = false;
  var sl1 = _slm.getListById('sl_watch');
  var sl2 = _slm.getListById('sl_watch2');
  var sl3 = _slm.getListById('sl_watch3');
  if ((sl1 && sl1.indexOf(stock.keyTicker) != -1) ||
    (sl2 && sl2.indexOf(stock.keyTicker) != -1) ||
    (sl3 && sl3.indexOf(stock.keyTicker) != -1)) {
    underWatch = true;
  }
  
  // watch/add button
  var btn = null;
  if (!underWatch && _currentList.listId != 'sl_indexes') {
    btn = document.createElement('input');
    btn.setAttribute('type', 'button');
    btn.setAttribute('class', 'gbutton gb_white gb_tiny left');
    btn.setAttribute('onclick', "toggleStockInList('" + stock.keyTicker + "', 'sl_watch')");
    btn.setAttribute('value', 'WATCH');
    actsNode.append(btn);
  }
  
  // alert button
  /*btn = document.createElement('input');
  btn.setAttribute('type', 'button');
  btn.setAttribute('class', 'gbutton gb_white gb_tiny left');
  btn.setAttribute('onclick', "launchAlertInputPanel('" + stock.keyTicker + "');");
  btn.setAttribute('value', 'ALERT');
  actsNode.append(btn);*/
  
  // move buttons
  if (_currentList.listId != 'sl_alert' &&
    _currentList.listId != 'sl_recent' &&
    _currentList.indexOf(stock.keyTicker) != -1) {
    actsNode.append(createMoveButton(stock.keyTicker));
  }
}
//
function setDetailPanelField(fieldSelector, value) {
  if (value)
    jQuery(fieldSelector).text(value);
  else
    jQuery(fieldSelector).html('&nbsp;-');
}
//
function updateDetailPanelOther(stock) {
  // input box
  var inputNode = jQuery('#symbol_input');
  if (!_userTyping && inputNode.val() != stock.ticker) {
    inputNode.val(stock.ticker);
  }
  if (_startup) {
    inputNode.select();
    _startup = 0;
  }
  // name & exchanges
  jQuery('#detail_exchange').text(stock.exchange.indexOf('INDEX') == -1 ? stock.exchange : 'INDEX');
  setDetailPanelField('#detail_name', (stock.name.length > 28 ? (stock.name.substr(0, 25) + '...') : stock.name));
  jQuery('#detail_name').attr('href', stock.url());
  // line 1
  setDetailPanelField('#detail_op', stock.open);
  setDetailPanelField('#detail_hi', stock.high);
  setDetailPanelField('#detail_lo', stock.low);
  if (stock.ext) { // extended hours
    setDetailPanelField('#detail_cl', stock.last);
    jQuery('#detail_cl_container').show();
  } else {
    setDetailPanelField('#detail_cl', null);
    jQuery('#detail_cl_container').hide();
  }
  // line 2
  setDetailPanelField('#detail_pe', stock.pe);
  setDetailPanelField('#detail_beta', stock.beta);
  setDetailPanelField('#detail_eps', stock.eps);
  setDetailPanelField('#detail_mc', stock.marketCap);
  // line 3
  if (stock.low52w && stock.high52w)
    jQuery('#detail_52wk').text(stock.low52w + ' - ' + stock.high52w);
  else
    setDetailPanelField('#detail_52wk', null);
  if (stock.vol && stock.avgVol)
    jQuery('#detail_vol').text(stock.vol + '/' + stock.avgVol);
  else
    setDetailPanelField('#detail_vol', null);
}
//
function onClickTopPanelFooter() {
  setDetailPanelStock('', false);
  setupTopPanel('', true);
}
//
function toggleStockInList(keyTicker, listId) {
  var sl = _slm.getListById(listId);
  if (!sl)
    return;
  if (sl.indexOf(keyTicker) == -1) { // not in list
    if (!sl.add(keyTicker)) {
      postMsg('Watch list capacity reached: ' + sl.limit + ' symbols.', 'warning');
      return;
    }
  } else { // alraedy in list
    sl.del(keyTicker);
  }
  if (sl.listId == _currentList.listId)
    _currentList = sl;
  // refresh
  refreshListPanel();
  refreshDetailPanel(true);
}
//
function moveWatchStockDown(keyTicker) {
  if (!_currentList)
    return;
  var index = _currentList.indexOf(keyTicker);
  if (index == -1) // should be impossible though..
    return;
  if (_currentList.size() - 1 == index)
    return; // already bottom
  // swap and save
  var tmp = _currentList.symbols[index + 1];
  _currentList.symbols[index + 1] = _currentList.symbols[index];
  _currentList.symbols[index] = tmp;
  _currentList.saveToLS();
  // refresh
  refreshListPanel();
}
//
function moveWatchStockUp(keyTicker) {
  if (!_currentList)
    return;
  var index = _currentList.indexOf(keyTicker);
  if (index < 1) // top or not in list
    return;
  // swap and save
  var tmp = _currentList.at(index - 1);
  _currentList.symbols[index - 1] = _currentList.symbols[index];
  _currentList.symbols[index] = tmp;
  _currentList.saveToLS();
  // refresh
  refreshListPanel();
}



//------------------------------------------------------------------------------
// Portfolio, Transactions
//------------------------------------------------------------------------------
function setupMidPanel(contentType, force) {
  if (contentType == 't') {
    jQuery('#alert_input').hide();
    jQuery('#trans_input').show();
    if (!_midPanelVisible)
      jQuery('#mid_panel').show('fast');
    _midPanelVisible = true;
  } else if (contentType == 'a') {
    jQuery('#trans_input').hide();
    jQuery('#alert_input').show();
    if (!_midPanelVisible)
      jQuery('#mid_panel').show('fast');
    _midPanelVisible = true;
  } else { // hide
    if (_midPanelVisible != false) {
      jQuery('#mid_panel').hide('fast');
      _midPanelVisible = false;
    }
  }
}
//
function showTransInputPanel(showNotHide) {
  setupMidPanel(showNotHide ? 't' : '');
}
//
function resetMidPanel(keyTicker) {
  if (_currentList.listId == 'sl_portfolio' && keyTicker) {
    if (_midPanelVisible)
      launchTransInputPanel(keyTicker);
  } else if (_currentList.listId == 'sl_alert' && keyTicker) {
    if (_midPanelVisible)
      launchAlertInputPanel(keyTicker);
  } else {
    setupMidPanel('');
  }
}
//
function resetTransInputPanel(keyTicker) {
  if (_currentList.listId != 'sl_portfolio' && !_midPanelVisible) {
    showTransInputPanel(false);
  } else if (_midPanelVisible && keyTicker) {
    launchTransInputPanel(keyTicker);
  }
}
//
function launchTransInputPanel(keyTicker) {
  var stock = _stocksData[keyTicker];
  if (!stock)
    return;
  var pos = _pm.getPosition(keyTicker);
  var toShort = (pos && pos.quantity > 0); // cause currently in long
  jQuery('#trans_direction').val(toShort ? '1'/*short*/ : '0'/*long*/);
  jQuery('#trans_direction').css('color', toShort ? '#aa0033' : '#008000');
  jQuery('#trans_shares').val(pos ? Math.abs(pos.quantity) : '100');
  jQuery('#trans_price').val(stock.effectiveLastPriceFloat().toFixed(2));
  jQuery('#trans_commission').val(getStrFromLS('_commission', '9.99'));
  showTransInputPanel(true);
}
//
function onTradeDirectionChange() {
  if ('0' == jQuery('#trans_direction option:selected').val()) // long
    jQuery('#trans_direction').css('color', '#008000');
  else
    jQuery('#trans_direction').css('color', '#aa0033');
}
//
function onClickConfirmTrans() {
  var keyTicker = getStrFromLS('detail_panel_stock', '');
  if (keyTicker) {
    var shares = parseInt(jQuery('#trans_shares').val());
    var direction = jQuery('#trans_direction option:selected').val() == '0' ? 'b' : 's';
    var price = parseFloat(jQuery('#trans_price').val());
    var commission = parseFloat(jQuery('#trans_commission').val());
    saveStrToLS('_commission', commission);
    var trans = new Transaction(keyTicker, direction, price, shares, commission);
    _pm.addTransaction(trans);
  }
  refreshListPanel();
  showTransInputPanel(false);
}
//
function onNumericInputKeyDown(event, nodeId, allowDecimal) {
  if ((event.keyCode >= 48 && event.keyCode <= 57) ||
    (event.keyCode >= 96 && event.keyCode <= 105)) {
    // numbers
  } else if (event.keyCode == 8 || event.keyCode == 9 || event.keyCode == 46 ||
    event.keyCode == 16 || (event.keyCode >= 37 && event.keyCode <= 40)) {
    // delete, backspace, shift, arrow left/up/right/down
  } else if (allowDecimal && (event.keyCode == 190 || event.keyCode == 110)) {
    // dot
    if (jQuery('#' + nodeId).val().indexOf('.') != -1) // already has a decimal point
      event.preventDefault();
  } else {
    event.preventDefault();
  }
}
//
function onPriceInputKeyDown(event, nodeId, step) {
  if (event.keyCode == 38) { // arrow up
    var node = jQuery('#' + nodeId);
    var newVal = parseFloat(node.val()) + step;
    node.val(newVal.toFixed(2));
    event.preventDefault();
  } else if (event.keyCode == 40) { // arrow down
    var node = jQuery('#' + nodeId);
    var newVal = parseFloat(node.val()) - step;
    node.val(newVal.toFixed(2));
    event.preventDefault();
  } else
    onNumericInputKeyDown(event, nodeId, true);
}
//
function removePosition(keyTicker) {
  _pm.delPosition(keyTicker);
  refreshListPanel();
}
//
function onClickPositionLine(event, keyTicker) {
  //if (event.ctrlKey == 1)
    //launchTransInputPanel(keyTicker);
  //else {
    if (keyTicker != getStrFromLS('detail_panel_stock', ''))
      resetMidPanel(keyTicker);
    onClickListLine(keyTicker);
  //}
}
//
function createPositionLine(keyTicker, stock, indexInList, listId, header) {
  if (!stock)
    return null;
  var pos = _pm.getPosition(stock.keyTicker);
  if (!pos)
    return null;
  pos.updatePrice(stock.effectiveLastPriceFloat());
  //pos.recalc();
  
  var useTotalCost = getIntFromLS('_use_total_cost', 0);
  var cost = (useTotalCost ? pos.costTotal : pos.costBasis);
  var useBreakevenPrice = getIntFromLS('_use_breakeven_price', 0);
  var onClickScript = "onClickPositionLine(event, '" + stock.keyTicker + "');";
  
  var lineNode = document.createElement('div');
  var lineNodeId = listId + '_' + indexInList;
  lineNode.setAttribute('class', 'pos_line');
  lineNode.setAttribute('id', lineNodeId);
  lineNode.setAttribute('onmouseover', "onMouseOverListLine(this.id)");
  lineNode.setAttribute('onmouseout', "onMouseOutListLine(this.id)");
  
  // ticker column
  var colNode = createListLineTickerColumn(stock, false, false);
  colNode.setAttribute('onclick', onClickScript); 
  lineNode.appendChild(colNode);
  
  // price column
  colNode = createListLinePriceColumn(stock);
  colNode.setAttribute('onclick', onClickScript);
  if (useBreakevenPrice)
    colNode.innerHTML = (cost / pos.quantity).toFixed(2);
  lineNode.appendChild(colNode);
  
  // shares
  colNode = document.createElement('div');
  colNode.setAttribute('class', 'col_shares');
  colNode.innerHTML = pos.quantityDisplay;
  colNode.setAttribute('onclick', onClickScript);
  lineNode.appendChild(colNode);
  
  // cost basis
  colNode = document.createElement('div');
  colNode.setAttribute('class', 'col_cost');
  colNode.innerHTML = useTotalCost ? pos.costTotalDisplay : pos.costBasisDisplay;
  colNode.setAttribute('onclick', onClickScript);
  lineNode.appendChild(colNode);

  // market value
  colNode = document.createElement('div');
  colNode.setAttribute('class', 'col_cost');
  colNode.innerHTML = pos.marketValueDisplay;
  colNode.setAttribute('onclick', onClickScript);
  lineNode.appendChild(colNode);
  
  // pnl
  colNode = document.createElement('div');
  var colNode2 = document.createElement('div');
  var gain = pos.marketValue - cost;
  switch (compareFloat(gain, 0.0)) {
  case -1:
    colNode.setAttribute('class', 'col_pnl price_r');
    colNode2.setAttribute('class', 'col_return price_r');
    break;
  case 1:
    colNode.setAttribute('class', 'col_pnl price_g');
    colNode2.setAttribute('class', 'col_return price_g');
    break;
  default:
    colNode.setAttribute('class', 'col_pnl');
    colNode2.setAttribute('class', 'col_return');
    break;
  }
  colNode.innerHTML = formatNumber(gain, 10000, 2);
  colNode2.innerHTML = (gain / cost * 100.0 * (pos.quantity < 0 ? -1.0 : 1.0)).toFixed(2) + '%';
  colNode.setAttribute('onclick', onClickScript);
  colNode2.setAttribute('onclick', onClickScript);
  lineNode.appendChild(colNode);  
  lineNode.appendChild(colNode2);
  
  return lineNode;
}
//
function createPositionHeaderLine(listId) {
  var lineNode = document.createElement('div');
  var lineNodeId = listId + '_header';
  lineNode.setAttribute('class', 'pos_header_line');
  lineNode.setAttribute('id', lineNodeId);
  //lineNode.setAttribute('onmouseover', "onMouseOverListLine(this.id)");
  //lineNode.setAttribute('onmouseout', "onMouseOutListLine(this.id)");
  
  var useTotalCost = getIntFromLS('_use_total_cost', 0);
  var useBreakevenPrice = getIntFromLS('_use_breakeven_price', 0);
  
  var colNode = createListLineTickerColumn(null, false, false);
  colNode.innerHTML = 'Stock';
  lineNode.appendChild(colNode);
  
  colNode = createListLinePriceColumn(null);
  colNode.innerHTML = useBreakevenPrice ? 'Breakeven +' : 'Last +';
  colNode.setAttribute('onclick', 'togglePositionPriceDisp();');
  lineNode.appendChild(colNode);
  
  colNode = document.createElement('div');
  colNode.setAttribute('class', 'col_shares');
  colNode.innerHTML = 'Size';
  lineNode.appendChild(colNode);
  
  colNode = document.createElement('div');
  colNode.setAttribute('class', 'col_cost_header');
  colNode.innerHTML = useTotalCost ? 'Cost Total +' : 'Cost Basis +';
  colNode.setAttribute('onclick', 'toggleCostCalcMethod();');
  lineNode.appendChild(colNode);

  colNode = document.createElement('div');
  colNode.setAttribute('class', 'col_cost');
  colNode.innerHTML = 'Mkt Value';
  lineNode.appendChild(colNode);
  
  colNode = document.createElement('div');
  colNode.setAttribute('class', 'col_pnl');
  colNode.innerHTML = 'P/L';
  lineNode.appendChild(colNode);
  
  colNode = document.createElement('div');
  colNode.setAttribute('class', 'col_return');
  colNode.innerHTML = 'Return';
  lineNode.appendChild(colNode);
  
  return lineNode;
}
//
function toggleCostCalcMethod() {
  saveStrToLS('_use_total_cost', getIntFromLS('_use_total_cost', 0) ? '0' : '1');
  refreshListPanel();
}
//
function togglePositionPriceDisp() {
  saveStrToLS('_use_breakeven_price', getIntFromLS('_use_breakeven_price', 0) ? '0' : '1');
  refreshListPanel();
}


//------------------------------------------------------------------------------
// Lists
//------------------------------------------------------------------------------
function refreshListPanel() {
  if (!_currentList)
    return;
  
  if (_currentList.listId == 'sl_alert') {
    refreshAlertBook();
    jQuery('#list_trailing').empty();
    return;
  } 
  
  var lineNode = null;
  var funcCreateLine = null;
  var funcCreateHeaderLine = null;
  var funcCreateTrailingLine = null;
  
  if (_currentList.listId == 'sl_portfolio') {
    _currentList.symbols = _pm.positions;
    _currentList.saveToLS();
    funcCreateHeaderLine = createPositionHeaderLine;
    funcCreateLine = createPositionLine;
  } else if (_currentList.listId == 'sl_indexes') {
    funcCreateLine = createIndexLine;
    funcCreateTrailingLine = createIndexAddLine;
  } else {
    funcCreateLine = createListLine;
  }
  
  var panelNode = jQuery('#list_panel');
  panelNode.empty();  
  
  // header
  if (funcCreateHeaderLine) {
    lineNode = funcCreateHeaderLine(_currentList.listId);
    if (lineNode)
      panelNode.append(lineNode);
  }
  
  // body
  var stock = null;
  var keyTicker = null;
  for (var i = 0; i < _currentList.size(); ++ i) {
    keyTicker = _currentList.at(i);
    stock = _stocksData[keyTicker];
    lineNode = funcCreateLine(keyTicker, stock, i, _currentList.listId);
    if (lineNode) {
      if (_currentList.listId == 'sl_recent')
        panelNode.prepend(lineNode);
      else
        panelNode.append(lineNode);
    }
  }
  
  // trailing
  if (funcCreateTrailingLine) {
    if (!_listPanelTrailingLineCreated) {
      jQuery('#list_trailing').empty();
      lineNode = funcCreateTrailingLine();
      if (lineNode) {
        jQuery('#list_trailing').append(lineNode);
        _listPanelTrailingLineCreated = true;
      }
    }
  } else {
    jQuery('#list_trailing').empty();
  }
}
//
function resetListPanelFooter() {
  var lineNode = jQuery('#list_footer');
  lineNode.empty();
  //var lists = ['sl_recent', 'sl_watch', 'sl_indexes', 'sl_portfolio', 'sl_alert'];
  //var lists = ['sl_recent', 'sl_watch', 'sl_indexes', 'sl_alert'];
  var lists = ['sl_recent', 'sl_watch', 'sl_indexes'];
  var symbolList = null;
  for (var i = 0; i < lists.length; ++ i) {
    symbolList = _slm.getListById(lists[i]);
    if (!symbolList || !symbolList.visible)
      continue;
    lineNode.append(createListFooterListItem(symbolList));
  }
  var colNode = document.createElement('a');
  colNode.setAttribute('id', 'list_footer_settings');
  colNode.setAttribute('target', '_blank');
  colNode.setAttribute('href', 'options.html');
  colNode.setAttribute('onmouseover', "setListFooterTooltip('Settings');");
  colNode.setAttribute('onmouseout', 'clearListFooterTooltips(3);');
  lineNode.append(colNode);
  /*colNode = document.createElement('div');
  colNode.setAttribute('id', 'list_footer_help');
  //lineNode.setAttribute('onclick', '');
  lineNode.append(colNode);*/
  if (!getIntFromLS('_app_rated', 0)) {
    colNode = document.createElement('a');
    colNode.setAttribute('id', 'list_footer_like');
    colNode.setAttribute('target', '_blank');
    colNode.setAttribute('href', 'https://chrome.google.com/webstore/detail/blgacpdckjckafjgcifkabibjbhnccdj');
    colNode.setAttribute('onclick', 'onMouseClickRateButton();');
    colNode.setAttribute('onmouseover', "setListFooterTooltip('Rate me!');");
    colNode.setAttribute('onmouseout', 'clearListFooterTooltips(3);');
    lineNode.append(colNode);
  }
  colNode = document.createElement('div');
  colNode.setAttribute('id', 'list_footer_tooltip');
  lineNode.append(colNode);
}
//
function onMouseClickRateButton() {
  saveStrToLS('_app_rated', '1');
}
//
function setListFooterTooltip(tooltip) {
  if (_tooltipTimer){
    window.clearTimeout(_tooltipTimer);
    _tooltipTimer = null;
  }
  jQuery('#list_footer_tooltip').html(tooltip + '&nbsp;');
}
//
function clearListFooterTooltips(delayInSecs) {
  if (delayInSecs)
    _tooltipTimer = window.setTimeout('clearListFooterTooltips(0);', delayInSecs * 1000);
  else
    jQuery('#list_footer_tooltip').html('&nbsp;');
}
//
function createListFooterListItem(symbolList) {
  var node = document.createElement('div');
  if (_currentList.listId == symbolList.listId)
    node.setAttribute('class', 'list_footer_col current');
  else
    node.setAttribute('class', 'list_footer_col');
  node.setAttribute('id', symbolList.listId);
  node.setAttribute('onclick', 'onSelectList(this.id);');
  // TODO: for current list, onclick could be rename functionality
  //if (symbolList.listId == 'sl_alert') {
  //  node.innerHTML = symbolList.name + "<span id='alert_hit_count'>(1)</span>";
  //} else
    node.innerHTML = symbolList.name;
  return node;
}
//
function onSelectList(listId) {
  if (listId == _currentList.listId)
    return;
  if (_slm.setCurrentList(listId)) {
    _currentList = _slm.getCurrentList(listId);
    _listPanelTrailingLineCreated = false;
    refreshListPanel();
    refreshDetailPanel(true);
    resetListPanelFooter();
    resetMidPanel();
  }
}



//------------------------------------------------------------------------------
// Message area
//------------------------------------------------------------------------------
function dismissMsg(msgId) {
  jQuery('#' + msgId).remove();
}
//
function postMsg(msg, type) {
  var msgNode = document.createElement('div');
  var msgId = 'msg_' + _msgCounter;
  _msgCounter ++;
  msgNode.setAttribute('id', msgId);
  if (type == 'warning') {
    msgNode.setAttribute('class', 'info_item ii_warning');
  } else if (type == 'alert_g') {
    msgNode.setAttribute('class', 'info_item ii_alert_g');
  } else if (type == 'alert_r') {
    msgNode.setAttribute('class', 'info_item ii_alert_r');
  } else { // regular msg
    msgNode.setAttribute('class', 'info_item ii_regular');
  }
  
  var colNode = document.createElement('div');
  colNode.setAttribute('class', 'col_info');
  colNode.innerHTML = msg;
  msgNode.appendChild(colNode);
  
  colNode = document.createElement('div');
  colNode.setAttribute('class', 'col_dismiss');
  var delBtn = createDelButton("dismissMsg('" + msgId + "')");
  colNode.appendChild(delBtn);
  msgNode.appendChild(colNode);
  
  jQuery('#info_area').prepend(msgNode);
}



//------------------------------------------------------------------------------
// Symbol Input, Input Suggestion, Quick Quote
//------------------------------------------------------------------------------
function onSymbolInputKeyDown(event) {
  _userTyping = true;
  var code = event.keyCode;
  if (code == 13) { // ENTER
    _userTyping = false;
    
    var input = '';
    if (_topPanelContent == 's' && _suggestionLines.length > 0) {
      if (_currSuggestion == -1) { // try with current input and first suggestion
        tryQuickQuoteTickers([jQuery("#symbol_input").val().toUpperCase(), _suggestionLines[0][1]]);
        return;
      }
      if (_currSuggestion >= 0 && _currSuggestion < _suggestionLines.length) // hit suggestion
        input = _suggestionLines[_currSuggestion][1];
    } else {
      input = jQuery("#symbol_input").val().toUpperCase();
    }
    _topPanelContent = '';
    _currSuggestion = -1;
    _suggestionLines = [];
    
    jQuery.trim(input);
    if (input) {
      try {
        quickQuote(input);
      } catch (err) {
        track('quick quote failed');
      }
    }
  } else if (code == 38) { // ARROW UP
    // Switch in suggestions
    if (_topPanelContent == 's') {
      event.preventDefault();
      // skip if no suggestions
      if (_suggestionLines.length < 1) {
        _currSuggestion = -1;
        return;
      }
      _currSuggestion = _currSuggestion < 1 ? -1 : _currSuggestion - 1;
      markSuggestion(_currSuggestion, true);
      return;
    }
    // Switch in symbol history
    _userTyping = false;
    var recentListSize = _recentList.size();
    if (_rposInRecent >= recentListSize || recentListSize < 1)
      return;
    event.preventDefault();
    _rposInRecent = (_rposInRecent < 1 ? 1 : _rposInRecent + 1);
    var index = _recentList.size() - _rposInRecent;
    var keyTicker = _recentList.at(index);
    if (keyTicker == getStrFromLS('detail_panel_stock', '')) {
      _rposInRecent ++;
      index = _recentList.size() - _rposInRecent;
      keyTicker = _recentList.at(index);
    }
    setDetailPanelStock(keyTicker, true);
    setupMidPanel('');
  } else if (code == 40) { // ARROW DOWN
    // Switch in suggestions
    if (_topPanelContent == 's') {
      event.preventDefault();
      // skip if already bottom or no suggestions
      if (_suggestionLines.length < 1) {
        _currSuggestion = -1;
        return;
      }
      if (_currSuggestion >= _suggestionLines.length - 1) {
        _currSuggestion = _suggestionLines.length - 1;
        return;
      }
      _currSuggestion = _currSuggestion < 0 ? 0 : _currSuggestion + 1;
      markSuggestion(_currSuggestion, true);
      return;
    }
    _userTyping = false;
    // Switch in symbol history
    if (_rposInRecent <= 1) {
      _rposInRecent = 0;
      return;
    }
    -- _rposInRecent;
    event.preventDefault();
    var recentListSize = _recentList.size();
    var index = _recentList.size() - _rposInRecent;
    var keyTicker = _recentList.at(index);
    setDetailPanelStock(keyTicker, true);
    setupMidPanel('');
  }
}
//
function onSymbolInputKeyUp(event) {
  if (_disableSuggestions)
    return;
  var code = event.keyCode;
  if ((code > 64 && code < 91) || (code > 47 && code < 58) ||
    (code > 95 && code < 106) || code == 8 || code == 46) { // codes that invoke suggestions
    var text = jQuery('#symbol_input').val();
    var index = text.indexOf(':');
    if (index != -1)
      text = text.substr(index + 1);
    text = jQuery.trim(text);
    if (text)
      autoComplete(text);
    else
      setupTopPanel('', true);
  }
}
//
function autoComplete(text) {
  $.ajax({
    type: "GET",
    url: "http://d.yimg.com/autoc.finance.yahoo.com/autoc",
    data: { query: text },
    dataType: "jsonp",
    jsonpCallback: "YAHOO.Finance.SymbolSuggest.ssCallback"
  });
}
//
function processSymbolSuggestResult(responseObj) {
  var suggestions = responseObj.ResultSet.Result;
  if (suggestions.length < 1) {
    setupTopPanel('', true);
    return;
  }

  var data = null;
  var symbol = null;
  var exchange = null;
  var dataList = [];
  var i = 0;
  var suggestion = null;
  for (i = 0; i < suggestions.length && i < 4; ++ i) {
    suggestion = suggestions[i];
    data = translateYahooSuggestionInfo(suggestion);
    if (data)
      dataList.push(data);
  }
  if (dataList.length < 1) { // no qualified suggestions
    setupTopPanel('', true);
    return;
  }
  var limit = 3;
  if (dataList.length > 3)
    limit = 4;
  
  var suggestionPanel = jQuery('#suggestions');
  suggestionPanel.empty();
  _suggestionLines = [];
  var lineNode = null;
  var n = 0;
  for (i = 0; i < dataList.length && i < limit; ++ i) {
    lineNode = createSuggestionLine(dataList[i], n, n == limit - 1, limit);
    if (lineNode) {
      suggestionPanel.append(lineNode);
      ++ n;
    }
  }
  setupTopPanel('s');
  
  while (n < limit) {
    suggestionPanel.append(createSuggestionLine(null, n, true, limit));
    ++ n;
  }
}
//
function createSuggestionLine(data, seqNum, last, maxLines) {
  var lineNode = document.createElement('div');
  var lineNodeId = 'sug_line_' + seqNum;
  var className = '';
  if (data)
    className = 'clickable ';
  className += maxLines > 3 ? 'sug_line_medium' : 'sug_line_large';
  lineNode.setAttribute('class', last ? className + '_last' : className);
  lineNode.setAttribute('id', lineNodeId);
  
  if (!data)
    return lineNode;
  
  lineNode.setAttribute('onmouseover', 'markSuggestion(' + seqNum + ')');
  //lineNode.setAttribute('onmouseout', 'onMouseOutSuggestion(' + seqNum + ')');
  lineNode.setAttribute('onclick', "onClickSuggestion('" + data.keyTicker + "')");
  
  // ticker column
  var colNode = document.createElement('div');
  colNode.setAttribute('class', 'col_t width_quad');
  colNode.innerHTML = data.symbol;
  lineNode.appendChild(colNode);
  
  colNode = document.createElement('div');
  colNode.setAttribute('class', 'col_exchange');
  colNode.innerHTML = data.exchange;
  lineNode.appendChild(colNode);
  
  colNode = document.createElement('div');
  colNode.setAttribute('class', _currentList.listId == 'sl_portfolio' ? 'col_name_long' : 'col_name');
  colNode.innerHTML = data.name;
  lineNode.appendChild(colNode);
  
  _suggestionLines.push([lineNodeId, data.keyTicker]);
  return lineNode;
}
//
function markSuggestion(seqNum) {
  _currSuggestion = seqNum;
  refreshSuggestionHighlight();
}
//
function refreshSuggestionHighlight() {
  for (var i = 0; i < _suggestionLines.length; ++ i) {
    if (_currSuggestion == i)
      jQuery('#' + _suggestionLines[i][0]).addClass('mouseover_highlight');
    else
      jQuery('#' + _suggestionLines[i][0]).removeClass('mouseover_highlight');
  }
}
//
function translateYahooSuggestionInfo(suggestion) {
  var data = {};
  if (suggestion.type == 'I') {
    var indexMappingY2G = getIndexMappingY2G();
    if (indexMappingY2G.hasOwnProperty(suggestion.symbol))
      data.keyTicker = indexMappingY2G[suggestion.symbol];
    else
      return null;
    data.exchange = 'INDEX';
    var i = data.keyTicker.indexOf(':');
    data.symbol = i == -1 ? data.keyTicker : data.keyTicker.substr(i + 1);
  } else if (suggestion.type == 'S' || suggestion.type == 'E') { // Stocks and ETF
    data.exchange = convertYahooExchCode(suggestion.exch, suggestion.exchDisp);
    if (data.exchange)
      data.symbol = convertYahooSymbol(suggestion.symbol, data.exchange);
    if (!data.symbol || !data.exchange)
      return null;
    data.keyTicker = data.exchange + ':' + data.symbol;
  } else { // TODO: support other types
    return null;
  }
  data.name = suggestion.name;
  
  return data;
}
//
function onClickSuggestion(keyTicker) {
  _userTyping = false;
  quickQuote(keyTicker, function() {
    setupTopPanel('', true);
  });
}
//
function tryQuickQuoteTickers(tickers, funcOnSuccess, funcOnFail) {
  //track(tickers);
  sendStockDataRequest(tickers, function(rawDataList) {
    processQuickQuoteSuccess(rawDataList);
    if (funcOnSuccess)
      funcOnSuccess();
  }, function() {
    jQuery('#symbol_input').val('');
    if (funcOnFail)
      funcOnFail();
  });
}
//
function quickQuote(tickerInput, funcOnFail) {
  var tickerCandidates = [];
  if (_disableSuggestions && tickerInput.indexOf(':') == -1) {
    var config = getConfig('default_exchange');
    if (config) {
      var mktCode = config.getValue();
      if (mktCode == 'USA') {
        // skip
      } else if (mktCode == 'PRC') {
        tickerCandidates = ['SHA:' + tickerInput, 'SHE:' + tickerInput];
      } else {
        tickerCandidates = [mktCode + ':' + tickerInput];
      }
    }
  }
  tickerCandidates.push(tickerInput);
  tryQuickQuoteTickers(tickerCandidates, null, funcOnFail);
}
//
function createStockAndSave(rawData) {
  var stock = new Stock(rawData);
  recentQuotes = getRecentQuotesFromLS(stock.keyTicker);
  var recentQuotesLimit = getIntFromLS('recent_quotes_limit', 12);
  doCalculations(stock, recentQuotes, recentQuotesLimit);
  // save
  stock.saveToLS();
  _stocksData[stock.keyTicker] = stock;
  return stock;
}
//
function processQuickQuoteSuccess(rawStockDataList) {
  if (rawStockDataList.length < 1)
    return; // hopefully not possible...
  // create stock obj
  var stock = createStockAndSave(rawStockDataList[0]);
  // add to recent list
  if (_recentList)
    _recentList.shiftAdd(stock.keyTicker);
  _rposInRecent = 0;
  // update UI
  _topPanelContent = '';
  setDetailPanelStock(stock.keyTicker, true);
  _currentList = _slm.getCurrentList();
  if (_currentList && _currentList.indexOf(stock.keyTicker) != -1)
    refreshListPanel();
  jQuery('#symbol_input').select();
  resetMidPanel(stock.keyTicker);
}
