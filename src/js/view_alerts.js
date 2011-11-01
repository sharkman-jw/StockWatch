//
// Alert Input Panel (Mid Panel)
//
var _ailModes = ['', '', '', '', ''];
//
function launchAlertInputPanel(keyTicker, useCachedModes) {
  if (!useCachedModes)
    _ailModes = ['', '', '', '', ''];
  
  var panel = jQuery('#alert_input');
  panel.empty();
  panel.append(createAlertInputHeader());
  
  var line = createAlertInputLine('a', null);
  //buildAlertInputLine_EditMode_Start(0, line, false);
  var al = new PriceHitAlert(6.0, 888888.88, -1);
  buildAlertInputLine_DispMode(line, al, false);
  panel.append(line);
  
  setupMidPanel('a');
  return;
  
  var sa = getStockAlertsFromLS(keyTicker);
  var i = 0;
  if (sa) {
    var alert = null;
    var lineNode = null;
    var mode = null;
    for (i = 0; i < sa.size(); ++ i) {
      alert = sa.at(i);
      lineNode = createAlertInputLine(i, _ailModes[i] ? _ailModes[i] : 'd', alert); // display mode
      panel.append(lineNode);
    }
  }
  
  if (!sa || sa.size() < 5) {
    lineNode = createAlertInputLine(i, 'a');
    panel.append(lineNode);
  }
  
  setupMidPanel('a');
}
//
function createAlertInputHeader() {
  var line = document.createElement('div');
  line.setAttribute('class', 'mid_line header');
  
  var col = document.createElement('div');
  col.setAttribute('class', 'ail_col_type');
  col.innerHTML = 'Alert Type';
  line.appendChild(col);
  
  col = document.createElement('div');
  col.setAttribute('class', 'ail_col_target');
  col.innerHTML = 'Target';
  line.appendChild(col);
  
  col = document.createElement('div');
  col.setAttribute('class', 'ail_col_tif');
  col.innerHTML = 'TIF';
  line.appendChild(col);
  
  return line;
}
//
function createAlertInputLine(buildMode, alert) {
  var line = document.createElement('div');
  if (alert)
    line.setAttribute('id', 'ail_' + alert.alertId);
  else
    line.setAttribute('id', 'ail_to_add');
  if (buildMode == 'a')
    buildAlertInputLine_AddMode(line, false);
  else if (buildMode == 'd')
    buildAlertInputLine_DispMode(line, alert, false);
  else
    line = null;
  return line;
}
//
function buildAlertInputLine_AddMode(line, isJQueryObj) {
  if (isJQueryObj) {
    // N/A
  } else {
    line.setAttribute('class', 'alert_input_line_add');
    line.setAttribute('onclick', 'onClickAlertInputAdd(this.id)');
    line.removeAttribute('onmouseover');
    line.removeAttribute('onmouseout');
    line.innerHTML = 'ADD';
  }
}
// edit mode, initial selecting stage
function buildAlertInputLine_EditMode_Start(index, line, isJQueryObj) {
  var lineId = initAlertInputLine(line, isJQueryObj);

  // alert type
  var col = createAlertInputColumn_Type_EditMode(lineId, 0);
  appendColToLine(col, line, isJQueryObj);
  
  // actions
  col = document.createElement('div');
  col.setAttribute('class', 'col_act');
  col.appendChild(createDelButton("")); // del button
  appendColToLine(col, line, isJQueryObj);
}
// edit mode, for new low/high alerts
function buildAlertInputLine_EditMode_HighLow(index, line, isJQueryObj, alertType) {
  var lineId = initAlertInputLine(line, isJQueryObj);
  
  // alert type
  alertType = alertType == 1 ? 1 : 2; // just in case..
  var col = createAlertInputColumn_Type_EditMode(lineId, alertType);
  appendColToLine(col, line, isJQueryObj);
  
  // target display
  col = document.createElement('div');
  if (alertType == 1) {
    col.setAttribute('class', 'ail_col_target_disp price_g font_small');
    col.innerHTML = 'new intraday high';
  } else {
    col.setAttribute('class', 'ail_col_target_disp price_r font_small');
    col.innerHTML = 'new intraday low';
  }
  appendColToLine(col, line, isJQueryObj);
  
  // time in force
  col = createAlertInputColumn_TIF_EditMode(lineId);
  appendColToLine(col, line, isJQueryObj);
  
  // actions
  col = createAlertInputColumn_Actions_EditMode();
  appendColToLine(col, line, isJQueryObj);
}
//
function buildAlertInputLine_EditMode_PriceHit(index, line, isJQueryObj) {
  var lineId = initAlertInputLine(line, isJQueryObj);
  
  // alert type
  var col = createAlertInputColumn_Type_EditMode(lineId, 3);
  appendColToLine(col, line, isJQueryObj);
  
  // hit direction
  col = document.createElement('div');
  col.setAttribute('class', 'ail_col_hitdir_edit');
  ctrl = document.createElement('select');
  ctrl.setAttribute('id', lineId + '_hd');
  ctrl.setAttribute('class', 'alert_hit_direction_select');
  ctrl.setAttribute('onchange', 'onHitDirectionChange(this.id)');
  // option 1
  opt = document.createElement('option');
  opt.setAttribute('value', '0');
  opt.setAttribute('style', 'color:#000000');
  opt.innerHTML = '- Either -';
  ctrl.appendChild(opt);
  // option 2
  opt = document.createElement('option');
  opt.setAttribute('value', '1');
  if (alert && alert.hitDir == 1)
    opt.setAttribute('selected', 'selected');
  opt.setAttribute('style', 'color:#008000');
  opt.innerHTML = 'Upward';
  ctrl.appendChild(opt);
  // option 3
  opt = document.createElement('option');
  opt.setAttribute('value', '-1');
  if (alert && alert.hitDir == -1)
    opt.setAttribute('selected', 'selected');
  opt.setAttribute('style', 'color:#aa0033');
  opt.innerHTML = 'Downward';
  ctrl.appendChild(opt);
  col.appendChild(ctrl);
  appendColToLine(col, line, isJQueryObj);
  
  // target price
  col = document.createElement('div');
  col.setAttribute('class', 'ail_col_prc');
  ctrl = document.createElement('input');
  ctrl.setAttribute('class', 'alert_target_price_input');
  ctrl.setAttribute('type', 'text');
  var targetPrice = 0.0;
  var alert = null;
  if (alert)
    targetPrice = alert.targetPrice;
  else { // guess user's target price
    var stock = _stocksData[getStrFromLS('detail_panel_stock', '')];
    if (stock)
      targetPrice = stock.effectiveLastPriceFloat() * (stock.trend == 'd' ? 0.99 : 1.01);
  }
  var step = 0.01;
  if (targetPrice > 1000.0)
    step = 1.0;
  else if (targetPrice > 50.0)
    step = 0.1;
  ctrl.setAttribute('onkeydown', 'onTargetPriceInputKeyDown(event,this.id,' + step + ',' + index + ",'" + lineId + "');");
  ctrl.setAttribute('value', targetPrice.toFixed(2));
  ctrl.setAttribute('id', lineId + '_tp');
  col.appendChild(ctrl);
  appendColToLine(col, line, isJQueryObj);
  
  // time in force
  col = createAlertInputColumn_TIF_EditMode(lineId);
  appendColToLine(col, line, isJQueryObj);
  
  // actions
  col = createAlertInputColumn_Actions_EditMode();
  appendColToLine(col, line, isJQueryObj);
}
//
function buildAlertInputLine_EditMode(index, line, alert, isJQueryObj) {
  _ailModes[index] = 'e';
  if (isJQueryObj) {
    line.empty();
    line.attr('class', 'mid_line');
    line.removeAttr('onclick');
    line.removeAttr('onmouseover');
    line.removeAttr('onmouseout');
  } else {
    while (line.childNodes.length > 0) {
      line.removeChild(line.firstChild);
    }
    line.setAttribute('class', 'mid_line');
    line.removeAttribute('onclick');
    line.removeAttribute('onmouseover');
    line.removeAttribute('onmouseout');
  }

  // hit direction
  var col = document.createElement('div');
  col.setAttribute('class', 'ail_col_hitdir_edit');
  var ctrl = document.createElement('select');
  var lineId = isJQueryObj ? line.attr('id') : line.getAttribute('id');
  ctrl.setAttribute('id', lineId + '_hd');
  ctrl.setAttribute('class', 'alert_hit_direction_select');
  ctrl.setAttribute('onchange', 'onHitDirectionChange(this.id)');
  // option 1
  var opt = document.createElement('option');
  opt.setAttribute('value', '0');
  opt.setAttribute('style', 'color:#000000');
  opt.innerHTML = '- First Hit -';
  ctrl.appendChild(opt);
  // option 2
  opt = document.createElement('option');
  opt.setAttribute('value', '1');
  if (alert && alert.hitDir == 1)
    opt.setAttribute('selected', 'selected');
  opt.setAttribute('style', 'color:#008000');
  opt.innerHTML = 'Upward';
  ctrl.appendChild(opt);
  // option 3
  opt = document.createElement('option');
  opt.setAttribute('value', '-1');
  if (alert && alert.hitDir == -1)
    opt.setAttribute('selected', 'selected');
  opt.setAttribute('style', 'color:#aa0033');
  opt.innerHTML = 'Downward';
  ctrl.appendChild(opt);
  col.appendChild(ctrl);
  if (isJQueryObj)
    line.append(col);
  else
    line.appendChild(col);
  
  // target hit price
  col = document.createElement('div');
  col.setAttribute('class', 'width_quad left');
  ctrl = document.createElement('input');
  ctrl.setAttribute('class', 'alert_target_price_input');
  ctrl.setAttribute('type', 'text');
  var targetPrice = 0.0;
  if (alert)
    targetPrice = alert.targetPrice;
  else { // guess user's target price
    var stock = _stocksData[getStrFromLS('detail_panel_stock', '')];
    if (stock)
      targetPrice = stock.effectiveLastPriceFloat() * (stock.trend == 'd' ? 0.99 : 1.01);
  }
  var step = 0.01;
  if (targetPrice > 1000.0)
    step = 1.0;
  else if (targetPrice > 50.0)
    step = 0.1;
  ctrl.setAttribute('onkeydown', 'onTargetPriceInputKeyDown(event,this.id,' + step + ',' + index + ",'" + lineId + "');");
  ctrl.setAttribute('value', targetPrice.toFixed(2));
  ctrl.setAttribute('id', lineId + '_tp');
  col.appendChild(ctrl);
  if (isJQueryObj)
    line.append(col);
  else
    line.appendChild(col);
  
  // actions
  col = document.createElement('div');
  col.setAttribute('class', 'col_act');
  // confirm button
  ctrl = document.createElement('input');
  ctrl.setAttribute('type', 'button');
  ctrl.setAttribute('class', 'gbutton gb_white gb_tiny left');
  ctrl.setAttribute('onclick', "onClickAlertInputDone(" + index + ", '" + lineId + "');");
  ctrl.setAttribute('value', 'DONE');
  col.appendChild(ctrl);
  // del button
  col.appendChild(createDelButton("onClickAlertInputDel(" + index + ", '" + lineId + "')"));
  if (isJQueryObj)
    line.append(col);
  else
    line.appendChild(col);
  
  // let target price field take focus on startup (of the edit mode)
  if (isJQueryObj)
    jQuery('#' + lineId + '_tp').focus();
}
//
function buildAlertInputLine_DispMode(line, alert, isJQueryObj) {
  var index = 0;
  
  var lineId = initAlertInputLine(line, isJQueryObj);
  if (alert.hit) {
    if (isJQueryObj) {
      line.attr('class', 'alert_line_hit prc_alert_' + (alert.isBearish() ? 'r' : 'g'));
    } else {
      line.setAttribute('class', 'alert_line_hit prc_alert_' + (alert.isBearish() ? 'r' : 'g'));
    }
  }
  
  var textColor = alert.isBearish() ? 'color:#aa0033' : 'color:#008000';
  
  var col = document.createElement('div');
  col.setAttribute('class', 'ail_col_type font_small');
  col.innerHTML = alert.typeText();
  appendColToLine(col, line, isJQueryObj);
  
  col = document.createElement('div');
  col.setAttribute('class', 'ail_col_target font_small');
  if (alert.type == 'ph') {
    if (alert.hitDirection) {
      col.innerHTML = "<span style='" + textColor + "'>" +
        alert.hitDirectionText() + '</span> ' + alert.targetPrice.toFixed(2);
    } else {
      col.innerHTML = alert.targetPrice.toFixed(2);
    }
    appendColToLine(col, line, isJQueryObj);
  } else if (alert.type == 'hl') {
    if (alert.hitDirection == 1) {
      col.innerHTML = 'new intraday high';
    } else {
    }
  }
  return;
  
  // Hit direction
  var col = document.createElement('div');
  col.setAttribute('class', 'ail_col_hitdir_disp');
  col.setAttribute('onclick', "onClickAlertInputEdit(" + index + ", '" + lineId + "')");
  col.innerHTML = alert.hitDirText();
  col.setAttribute('style', textColor);
  if (isJQueryObj)
    line.append(col);
  else
    line.appendChild(col);
  
  // Target price
  col = document.createElement('div');
  if (alert.hit) {
    col.setAttribute('style', textColor);
    col.setAttribute('class', 'al_col_prc font_bold');
  } else
    col.setAttribute('class', 'al_col_prc');
  col.setAttribute('onclick', "onClickAlertInputEdit(" + index + ", '" + lineId + "')");
  col.innerHTML = alert.targetPrice.toFixed(2);
  if (isJQueryObj)
    line.append(col);
  else
    line.appendChild(col);
  
  // Hit time
  if (alert.hit) {
    col = document.createElement('div');
    col.setAttribute('class', 'col_remarks_hit');
    if (alert.hit)
      col.setAttribute('style', textColor);
    col.innerHTML = alert.timestamp ? alert.timestamp : ' ';
    if (isJQueryObj)
      line.append(col);
    else
      line.appendChild(col);
  }
  
  // Actions
  col = document.createElement('div');
  if (alert.hit) { // delete button
    col.setAttribute('class', 'col_act');
    col.appendChild(createDelButton("onClickAlertInputDel(" + index + ", '" + lineId + "')"));
  } else { // edit button
    if (isJQueryObj) {
      line.attr('onmouseover', "jQuery('#" + lineId + " .col_act').show();");
      line.attr('onmouseout', "jQuery('#" + lineId + " .col_act').hide();");
    } else {
      line.setAttribute('onmouseover', "jQuery('#" + lineId + " .col_act').show();");
      line.setAttribute('onmouseout', "jQuery('#" + lineId + " .col_act').hide();");
    }
    col.setAttribute('class', 'col_act no_display');
    var ctrl = document.createElement('input');
    ctrl.setAttribute('type', 'button');
    ctrl.setAttribute('class', 'gbutton gb_white gb_tiny left');
    ctrl.setAttribute('onclick', "onClickAlertInputEdit(" + index + ", '" + lineId + "')");
    ctrl.setAttribute('value', 'EDIT');
    col.appendChild(ctrl);
  }
  if (isJQueryObj) {
    line.append(col);
  } else {
    line.appendChild(col);
  }
}
// Customize the key down response for targe price input
function onTargetPriceInputKeyDown(event, ctrlId, step, lineIndex, lineId) {
  if (event.keyCode == 13)
    onClickAlertInputDone(lineIndex, lineId);
  else
    onPriceInputKeyDown(event, ctrlId, step);
}
// Switch from Add mode to Edit mode
function onClickAlertInputAdd(lineId) {
  buildAlertInputLine_EditMode_Start(0, jQuery('#' + lineId), true);
}
//
function onClickAlertInputEdit(index, lineId) {
  var keyTicker = getStrFromLS('detail_panel_stock', null);
  if (!keyTicker) {
    setupMidPanel('');
    return;
  }
  var sa = getStockAlertsFromLS(keyTicker);
  if (!sa) {
    launchAlertInputPanel(keyTicker);
    return;
  }
  var line = jQuery('#' + lineId);
  var alert = sa.at(index);
  // switch from Display mode to Edit mode
  buildAlertInputLine_EditMode(index, line, alert, true);
}
//
function onClickAlertInputDone(index, lineId) {
  // retrieve data
  var keyTicker = getStrFromLS('detail_panel_stock', null);
  if (!keyTicker) {
    setupMidPanel('');
    return;
  }
  var stock = _stocksData[keyTicker];
  if (!stock) {
    launchAlertInputPanel(keyTicker);
    return;
  }
  var sa = getStockAlertsFromLS(keyTicker);
  if (!sa) {
    sa = new StockAlerts(keyTicker);
    _currentList.add(keyTicker);
  }
  // retrieve inputs
  var targetPrice = parseFloat(jQuery('#' + lineId + '_tp').val());
  var hitDirection = parseInt(jQuery('#' + lineId + '_hd').val());
  // update/add alert
  var alert = null;
  var newAlert = false;
  if (index < sa.size()) {
    alert = sa.at(index);
    alert.init(stock.effectiveLastPriceFloat(), targetPrice, hitDirection);
  } else {
    alert = sa.add(stock.effectiveLastPriceFloat(), targetPrice, hitDirection);
    newAlert = true;
  }
  sa.saveToLS();
  // refresh alert input panel and list panel
  // switch from Edit mode to Display mode
  if (alert) {
    var line = jQuery('#' + lineId);
    buildAlertInputLine_DispMode(line, alert, true);
    if (newAlert && sa.size() < 5) {
      var lineNode = createAlertInputLine(sa.size(), 'a');
      jQuery('#alert_input').append(lineNode);
    }
  } else { // hopefully we don't come here...
    launchAlertInputPanel(keyTicker);
  }
  refreshListPanel();
}
//
function onClickAlertInputDel(index, lineId) {
  var keyTicker = getStrFromLS('detail_panel_stock', null);
  if (!keyTicker) {
    setupMidPanel('');
    return;
  }
  var sa = getStockAlertsFromLS(keyTicker);
  if (!sa) {
    launchAlertInputPanel(keyTicker);
    return;
  }
  if (index < sa.size()) {
    sa.delAt(index);
    _ailModes.splice(index, 1);
    _ailModes.push('');
  }
  // switch from Edit mode to Display mode while keeping other lines' modes not
  // affected
  launchAlertInputPanel(keyTicker, true);
  refreshListPanel();
}
//
function onHitDirectionChange(nodeId) {
  var val = parseInt(jQuery('#' + nodeId + ' option:selected').val());
  var color = '#000000';
  switch (val) {
  case 1:
    color = '#008000';
    break;
  case -1:
    color = '#aa0033';
    break;
  default:
    break;
  }
  jQuery('#' + nodeId).css('color', color);
}
//
function onAlertTypeChange(lineId, ctrlId) {
  var val = parseInt(jQuery('#' + ctrlId + ' option:selected').val());
  switch (val) {
  case 1:
    buildAlertInputLine_EditMode_HighLow(null, jQuery('#' + lineId), true, 1);
    break;
  case 2:
    buildAlertInputLine_EditMode_HighLow(null, jQuery('#' + lineId), true, 2);
    break;
  case 3: // price hit alert
    buildAlertInputLine_EditMode_PriceHit(null, jQuery('#' + lineId), true);
    break;
  case 0:
  default:
    buildAlertInputLine_EditMode_Start(null, jQuery('#' + lineId), true);
    break;
  }
}
//
function appendColToLine(col, line, isLineJQueryObj) {
  if (isLineJQueryObj)
    line.append(col);
  else
    line.appendChild(col);
}
//
function initAlertInputLine(line, isJQueryObj) {
  var lineId = null;
  if (isJQueryObj) {
    lineId = line.attr('id');
    line.empty();
    line.attr('class', 'mid_line');
    line.removeAttr('onclick');
    line.removeAttr('onmouseover');
    line.removeAttr('onmouseout');
  } else {
    lineId = line.getAttribute('id');
    while (line.childNodes.length > 0) {
      line.removeChild(line.firstChild);
    }
    line.setAttribute('class', 'mid_line');
    line.removeAttribute('onclick');
    line.removeAttribute('onmouseover');
    line.removeAttribute('onmouseout');
  }
  return lineId;
}
//
function createAlertInputColumn_Actions_EditMode() {
  var col = document.createElement('div');
  col.setAttribute('class', 'col_act');
  // confirm button
  var ctrl = document.createElement('input');
  ctrl.setAttribute('type', 'button');
  ctrl.setAttribute('class', 'gbutton gb_white gb_tiny left');
  ctrl.setAttribute('onclick', "");
  ctrl.setAttribute('value', 'DONE');
  col.appendChild(ctrl);
  // del button
  ctrl = createDelButton("");
  col.appendChild(ctrl);
  return col;
}
//
function createAlertInputColumn_TIF_EditMode(parentLineId) {
  var col = document.createElement('div');
  col.setAttribute('class', 'ail_col_tif_edit');
  ctrl = document.createElement('select');
  ctrl.setAttribute('id', parentLineId + '_tif');
  ctrl.setAttribute('class', 'alert_tif_select');
  ctrl.setAttribute('onchange', '');
  // option 1
  opt = document.createElement('option');
  opt.setAttribute('value', '0');
  opt.innerHTML = 'Today';
  ctrl.appendChild(opt);
  // option 2
  opt = document.createElement('option');
  opt.setAttribute('value', '1');
  opt.innerHTML = 'One Hit';
  ctrl.appendChild(opt);
  // option 3
  opt = document.createElement('option');
  opt.setAttribute('value', '2');
  opt.innerHTML = 'Persistent';
  ctrl.appendChild(opt);
  col.appendChild(ctrl);
  return col;
}
//
function createAlertInputColumn_Type_EditMode(parentLineId, initValue) {
  var col = document.createElement('div');
  col.setAttribute('class', 'ail_col_type');
  var ctrl = document.createElement('select');
  ctrl.setAttribute('id', parentLineId + '_at');
  ctrl.setAttribute('class', 'alert_type_select');
  ctrl.setAttribute('onchange', "onAlertTypeChange('" + parentLineId + "', this.id)");
  // option 0
  var opt = document.createElement('option');
  opt.setAttribute('value', '0');
  opt.innerHTML = '- select -';
  ctrl.appendChild(opt);
  // option 1
  opt = document.createElement('option');
  opt.setAttribute('value', '1');
  if (initValue == 1)
    opt.setAttribute('selected', 'selected');
  opt.innerHTML = 'Day High';
  ctrl.appendChild(opt);
  // option 2
  opt = document.createElement('option');
  opt.setAttribute('value', '2');
  if (initValue == 2)
    opt.setAttribute('selected', 'selected');
  opt.innerHTML = 'Day Low';
  ctrl.appendChild(opt);
  // option 3
  opt = document.createElement('option');
  opt.setAttribute('value', '3');
  if (initValue == 3)
    opt.setAttribute('selected', 'selected');
  opt.innerHTML = 'Price Hit';
  ctrl.appendChild(opt);
  col.appendChild(ctrl);
  return col;
}



//
// Alerts Display Panel (List Panel)
//
function refreshAlertBook() {
  var panelNode = jQuery('#list_panel');
  panelNode.empty();
  panelNode.append(createAlertHeaderLine());
  
  var sl = _slm.getListById('sl_alert');
  if (sl.size() < 1) {
    // add instruction line
    panelNode.append(createHintLine());
    return;
  }
  
  var sa = null;
  var stock = null;
  var alert = null;
  var lastPrice = 0.0;
  var closestAlert = null;
  var closestDiff = null;
  var diff = 0.0;
  var hitAlerts = 0;
  var unhitAlerts = 0;
  var j = 0;
  var unhitLines = [];
  var line = null;
  for (var i = 0; i < sl.size(); ++ i) {
    sa = getStockAlertsFromLS(sl.at(i));
    stock = getStockFromLS(sl.at(i));
    if (!sa || !stock)
      continue;
    lastPrice = stock.effectiveLastPriceFloat();
    closestAlert = null;
    closestDiff = null;
    unhitAlerts = 0;
    for (j = 0; j < sa.size(); ++ j) {
      alert = sa.at(j);
      if (alert.hit) {
        ++ hitAlerts;
        line = createHitAlertLine(hitAlerts, stock, alert, lastPrice);
        if (line)
          panelNode.append(line);
      } else {
        ++ unhitAlerts;
        diff = Math.abs(lastPrice - alert.targetPrice);
        if (!closestDiff || diff < closestDiff) {
          closestAlert = alert;
          closestDiff = diff;
        }
      }
    }
    line = createUnhitAlertLine(i, stock, lastPrice, closestAlert, unhitAlerts);
    if (line)
      unhitLines.push(line);
  }
  
  for (j = 0; j < unhitLines.length; ++ j)
    panelNode.append(unhitLines[j]);
}
//
function createAlertHeaderLine() {
  var line = document.createElement('div');
  var lineId = 'sl_alert_header';
  line.setAttribute('class', 'header_line');
  line.setAttribute('id', lineId);
  
  var col = document.createElement('div');
  col.setAttribute('class', 'col_t al_col_t');
  col.innerHTML = 'Stock';
  line.appendChild(col);
  
  col = document.createElement('div');
  col.setAttribute('class', 'al_col_prc');
  col.innerHTML = 'Alert Price';
  line.appendChild(col);
  
  //col = document.createElement('div');
  //col.setAttribute('class', 'col_remarks');
  //col.innerHTML = '-';
  //line.appendChild(col);
  
  return line;
}
//
function createHintLine() {
  var line = document.createElement('div');
  line.setAttribute('id', 'sl_alert_hint');
  line.setAttribute('onclick', "jQuery('#symbol_input').focus()");
  
  var span = document.createElement('span');
  span.setAttribute('id', 'add_alert_instruction');
  span.innerHTML = 'To add an alert, type in symbol and click ';
  line.appendChild(span);
  
  var btn = document.createElement('a');
  btn.setAttribute('class', 'gbutton gb_white gb_tiny left');
  btn.innerHTML = 'ALERT';
  line.appendChild(btn);
  return line;
}
//
function createUnhitAlertLine(index, stock, lastPrice, alert, pendingAlerts) {
  var line = document.createElement('div');
  var lineId = 'sl_alert_' + index;
  line.setAttribute('class', 'quote_line');
  line.setAttribute('id', lineId);
  line.setAttribute('onmouseover', "onMouseOverListLine(this.id)");
  line.setAttribute('onmouseout', "onMouseOutListLine(this.id)");
  
  var onClickScript = "onClickAlertLine('" + stock.keyTicker + "');";
  
  // ticker column
  var col = document.createElement('div');
  col.setAttribute('class', 'col_t al_col_t');
  // symbol
  var symbolNode = document.createElement('a');
  symbolNode.setAttribute('target', '_blank');
  symbolNode.setAttribute('href', stock.url());
  symbolNode.innerHTML = stock.ticker;
  col.appendChild(symbolNode);
  // exchange
  var exchange = '';
  if (stock.exchange != 'NYSE' && stock.exchange != 'NASDAQ' && stock.exchange != 'AMEX') {
    if (stock.exchange.indexOf('INDEX') != -1) // indices
      exchange = 'INDEX';
    else // non-us exchanges
      exchange = stock.exchange;
  }
  if (exchange) {
    var exchangeNode = document.createElement('span');
    exchangeNode.setAttribute('class', 'exchange_al');
    exchangeNode.innerHTML = exchange;
    col.appendChild(exchangeNode);
  }
  col.setAttribute('onclick', onClickScript);
  line.appendChild(col);
  
  // target price/hit price
  col = document.createElement('div');
  if (alert && alert.hitDir)
    col.setAttribute('class', 'al_col_prc price_' + (alert.hitDir == 1 ? 'g' : 'r'));
  else
    col.setAttribute('class', 'al_col_prc');
  col.innerHTML = alert ? alert.targetPrice.toFixed(2) : '-';
  col.setAttribute('onclick', onClickScript);
  line.appendChild(col);
  
  col = document.createElement('div');
  col.setAttribute('class', 'col_remarks');
  col.innerHTML = pendingAlerts > 1 ? 'and ' + (pendingAlerts - 1) + ' more pending' : '&nbsp;';
  col.setAttribute('onclick', onClickScript);
  line.appendChild(col);
  
  if (0 == pendingAlerts) {
    col = document.createElement('div');
    if (_currentMouseOverLine == lineId)
      col.setAttribute('class', 'col_act');
    else
      col.setAttribute('class', 'col_act no_display');
    col.appendChild(createDelButton("removeStockAlerts('" + stock.keyTicker + "')"));
    line.appendChild(col);
  }
  
  return line;
}
//
function createHitAlertLine(index, stock, alert, lastPrice) {
  var line = document.createElement('div');
  var lineId = 'hit_' + index;
  line.setAttribute('class', 'alert_line_hit prc_alert_' + (alert.hitDir == -1 ? 'r' : 'g'));
  line.setAttribute('id', lineId);
  
  var onClickScript = "onClickAlertLine('" + stock.keyTicker + "');";
  var colorClass = 'price_' + (alert.hitDir == -1 ? 'r' : 'g');
  
  // ticker column
  var col = document.createElement('div');
  col.setAttribute('class', 'col_t al_col_t');
  // symbol
  var symbolNode = document.createElement('span');
  symbolNode.setAttribute('class', colorClass);
  symbolNode.innerHTML = stock.ticker;
  col.appendChild(symbolNode);
  // exchange
  var exchange = '';
  if (stock.exchange != 'NYSE' && stock.exchange != 'NASDAQ' && stock.exchange != 'AMEX') {
    if (stock.exchange.indexOf('INDEX') != -1) // indices
      exchange = 'INDEX';
    else // non-us exchanges
      exchange = stock.exchange;
  }
  if (exchange) {
    var exchangeNode = document.createElement('span');
    exchangeNode.setAttribute('class', 'exchange_al');
    exchangeNode.innerHTML = exchange;
    col.appendChild(exchangeNode);
  }
  col.setAttribute('onclick', onClickScript);
  line.appendChild(col);
  
  // hit price
  col = document.createElement('div');
  col.setAttribute('class', 'al_col_prc font_bold ' + colorClass);
  col.innerHTML = alert.targetPrice.toFixed(2);
  col.setAttribute('onclick', onClickScript);
  line.appendChild(col);
  
  // remarks
  col = document.createElement('div');
  col.setAttribute('class', 'col_remarks_hit ' + colorClass);
  col.setAttribute('onclick', onClickScript);
  col.innerHTML = alert.timestamp ? alert.timestamp : '-';
  line.appendChild(col);
  
  // actions
  col = document.createElement('div');
  col.setAttribute('class', 'col_act');
  col.appendChild(createDelButton("deleteHitAlert('" + stock.keyTicker + "'," + alert.targetPrice + "," + alert.hitDir + ")"));
  line.appendChild(col);
  
  return line;
}
//
function onClickAlertLine(keyTicker) {
  launchAlertInputPanel(keyTicker);
  onClickListLine(keyTicker);
}



//
// Logics
//

// Delete a hit alert entry from stock, according to target price and hit direction
function deleteHitAlert(keyTicker, targetPrice, hitDirection) {
  var sa = getStockAlertsFromLS(keyTicker);
  if (!sa)
    return;
  var alert = null;
  var index = null;
  for (var i = 0; i < sa.size(); ++ i) {
    alert = sa.at(i);
    if (alert.hit && alert.hitDir == hitDirection && 0 == compareFloat(alert.targetPrice, targetPrice)) {
      sa.delAt(i); // delete the matched alert
      index = i;
      break;
    }
  }
  refreshListPanel();
  // update alert input panel if alert input panel is open for this ticker
  if (keyTicker == getStrFromLS('detail_panel_stock', null)) {
    launchAlertInputPanel(keyTicker, true);
    if (index) {
      _ailModes.splice(index, 1);
      _ailModes.push('');
    }
  }
}
// Delete a StockAlerts entry from system
function removeStockAlerts(keyTicker) {
  getStockAlertsFromLS(keyTicker).remove();
  _currentList.del(keyTicker);
  refreshListPanel();
}



//
// Other
//
function cleanupGarbageAlerts() {
  var alertList = _slm.getListById('sl_alert');
  var n = 0;
  var dataKeyPat = /^a_(.+)$/i;
  var matchedResults = null;
  for (each in localStorage) {
    matchedResults = each.match(dataKeyPat);
    if (matchedResults && alertList.indexOf(matchedResults[1]) == -1) {
      localStorage.removeItem(each);
      n ++;
    }
  }
  return n;
}

