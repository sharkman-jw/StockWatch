//
function createIndexLine(keyTicker, stock, indexInList, listId) {  
  var lineNode = document.createElement('div');
  var lineNodeId = listId + '_' + indexInList;
  lineNode.setAttribute('class', 'quote_line');
  lineNode.setAttribute('id', lineNodeId);
  lineNode.setAttribute('onmouseover', "onMouseOverListLine(this.id)");
  lineNode.setAttribute('onmouseout', "onMouseOutListLine(this.id)");
  
  var onClickScript = stock ? "onClickListLine('" + stock.keyTicker + "');" : null;
  
  // flag column
  var index = getIndexes()[keyTicker];
  var tmpNode = document.createElement('div');
  if (index)
    tmpNode.setAttribute('class', 'flag flag_' + index.regionCode);
  else
    tmpNode.setAttribute('class', 'flag');

  var colNode = document.createElement('div');
  colNode.setAttribute('class', 'col_flag');
  if (onClickScript)
    colNode.setAttribute('onclick', onClickScript);
  colNode.appendChild(tmpNode);
  lineNode.appendChild(colNode);
  
  // ticker column
  var tmpNode = document.createElement('a');
  tmpNode.setAttribute('target', '_blank');
  if (stock)
    tmpNode.setAttribute('href', stock.url());
  tmpNode.innerHTML = index ? index.disp : keyTicker;
  
  var colNode = document.createElement('div');
  colNode.appendChild(tmpNode);
  colNode.setAttribute('class', 'col_index_name');
  if (onClickScript)
    colNode.setAttribute('onclick', onClickScript);
  lineNode.appendChild(colNode);
  
  // price column
  if (stock) {
    colNode = createListLinePriceColumn(stock);
    if (!colNode)
        return null;
    colNode.setAttribute('onclick', onClickScript);
    lineNode.appendChild(colNode);

     // changes columns (value change & percentage change)
    colNode = document.createElement('div');
    var colNode2 = document.createElement('div');
    var percentage = parseFloat(stock.effectivePercentChange());
    if (Math.abs(percentage) < 0.0001) { // no change
      colNode.setAttribute('class', 'col_c');
      colNode2.setAttribute('class', 'col_cp');
    } else if (percentage < 0.0) { // lose
      colNode.setAttribute('class', 'col_c price_r');
      colNode2.setAttribute('class', 'col_cp price_r');
    } else { // gain
      colNode.setAttribute('class', 'col_c price_g');
      colNode2.setAttribute('class', 'col_cp price_g');
    }
    colNode.setAttribute('onclick', onClickScript);
    colNode2.setAttribute('onclick', onClickScript);
    colNode.innerHTML = stock.effectiveChange();
    colNode2.innerHTML = percentage.toFixed(2) + '%';
    lineNode.appendChild(colNode);
    lineNode.appendChild(colNode2);
  }

  // actions column
  colNode = createActionColumn(keyTicker, stock, listId, lineNodeId);
  if (!colNode)
    return null;
  lineNode.appendChild(colNode);
  
  return lineNode;
}
//
var _indexAddLineStatus = 0;
//
function createIndexAddLine(checkCapacity) {
  if (_currentList.listId != 'sl_indexes')
    return null;
  
  if (_currentList.size() >= _currentList.limit) {
    if (checkCapacity)
      postMsg('Capacity reached: ' + _currentList.limit + ' symbols.', 'warning');
    return null;
  }
  
  var lineNode = document.createElement('div');
  var lineNodeId = 'sl_indexes_add';
  lineNode.setAttribute('id', lineNodeId);
  
  if (0 == _indexAddLineStatus) {
    lineNode.setAttribute('class', 'index_line_add_0');
    lineNode.setAttribute('onclick', 'onToggleIndexAddLineStatus()');
    lineNode.innerHTML = 'ADD';
  } else {
    lineNode.setAttribute('class', 'index_line_add_1');
    
    var indexesByRegions = getIndexesByRegions();
    
    // Region selections
    var ctrlNode = document.createElement('select');
    ctrlNode.setAttribute('id', 'sel_region');
    var optNode = null;
    var indexes = null;
    for (each in indexesByRegions) {
      optNode = document.createElement('option');
      optNode.setAttribute('value', each);
      indexes = indexesByRegions[each];
      optNode.innerHTML = indexes[0].region;
      if (indexes[0].regionCode == 'us')
        optNode.setAttribute('selected', 'selected');
      ctrlNode.appendChild(optNode);
    }
    ctrlNode.setAttribute('onchange', "onIndexRegionSelChanged(this.value)");
    
    var colNode = document.createElement('div');
    colNode.setAttribute('class', 'detail_col_tri');
    colNode.appendChild(ctrlNode);
    lineNode.appendChild(colNode);
    
    // Index selections
    ctrlNode = document.createElement('select');
    ctrlNode.setAttribute('id', 'sel_index');
    indexes = indexesByRegions['us'];
    for (var i = 0; i < indexes.length; ++ i) {
      optNode = document.createElement('option');
      optNode.setAttribute('value', indexes[i].gticker);
      optNode.innerHTML = indexes[i].name;
      ctrlNode.appendChild(optNode);
    }
    ctrlNode.setAttribute('onchange', "onIndexSelChanged(this.value)");
    
    colNode = document.createElement('div');
    colNode.setAttribute('class', 'col_index_name_sel');
    colNode.appendChild(ctrlNode);
    lineNode.appendChild(colNode);
    
    // Buttons
    colNode = document.createElement('div');
    colNode.setAttribute('class', 'right');
    colNode.setAttribute('id', 'acts_index_add');
    
    ctrlNode = document.createElement('input');
    ctrlNode.setAttribute('type', 'button');
    ctrlNode.setAttribute('class', 'gbutton gb_white gb_tiny left');
    ctrlNode.setAttribute('id', 'btn_add_index');
    ctrlNode.setAttribute('value',  'ADD');
    ctrlNode.setAttribute('onclick', "onClickAddIndex(jQuery('#sel_index').val())");
    colNode.appendChild(ctrlNode);
    
    ctrlNode = document.createElement('input');
    ctrlNode.setAttribute('type', 'button');
    ctrlNode.setAttribute('class', 'gbutton gb_white gb_tiny left');
    ctrlNode.setAttribute('value', 'X');
    ctrlNode.setAttribute('onclick', 'onToggleIndexAddLineStatus()');
    colNode.appendChild(ctrlNode);
    
    lineNode.appendChild(colNode);
  }
  return lineNode;
}
//
function onClickAddIndex(keyTicker) {
  onToggleIndexAddLineStatus();
  tryQuickQuoteTickers([keyTicker], function() {
    toggleStockInList(keyTicker, 'sl_indexes');
    refreshListPanel();
  });
}
//
function onIndexRegionSelChanged(regionCode) {
  var indexes = getIndexesByRegions()[regionCode];
  var selNode = jQuery('#sel_index');
  selNode.empty();
  var optNode = null;
  for (var i = 0; i < indexes.length; ++ i) {
    optNode = document.createElement('option');
    optNode.setAttribute('value', indexes[i].gticker);
    optNode.innerHTML = indexes[i].name;
    selNode.append(optNode);
  }
  onIndexSelChanged(indexes[0].gticker);
}
//
function onIndexSelChanged(keyTicker) {
  if (_currentList.indexOf(keyTicker) == -1)
    jQuery('#btn_add_index').show();
  else
    jQuery('#btn_add_index').hide();
}
//
function onToggleIndexAddLineStatus() {
  jQuery('#sl_indexes_add').remove();
  if (_indexAddLineStatus == 0) {
    _indexAddLineStatus = 1;
    jQuery('#list_trailing').append(createIndexAddLine(true));
    if (_currentList.indexOf(getIndexesByRegions()['us'][0].gticker) != -1)
      jQuery('#btn_add_index').hide();
  } else {
    _indexAddLineStatus = 0;
    jQuery('#list_trailing').append(createIndexAddLine(false));
  }
}
