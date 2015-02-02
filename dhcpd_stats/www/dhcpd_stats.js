(function($){
  var parseDateStr = function(s){
    var dateStr = s.split(' ')[0],
        timeStr = s.split(' ')[1],
        msStr,
        offsetStr,
        dateArgs = [],
        offsetMilliseconds = 0,
        milliseconds;
    if (s.indexOf('+') != -1){
      offsetStr = s.split('+')[1];
      timeStr = timeStr.split('+')[0];
    }
    if (timeStr.indexOf('.') != -1){
      msStr = timeStr.split('.')[1];
      timeStr = timeStr.split('.')[0];
    }
    $.each(dateStr.split('-'), function(i, v){
      v = parseInt(v);
      if (i == 1){
        v -= 1;
      }
      dateArgs.push(v);
    });
    $.each(timeStr.split(':'), function(i, v){
      dateArgs.push(parseInt(v));
    });
    if (msStr){
      dateArgs.push(parseInt(msStr) / 1000);
    }
    milliseconds = Date.UTC.apply(Date, dateArgs);
    if (offsetStr){
      offsetMilliseconds = offsetStr.split(':')[0] * 3600 * 1000;
      offsetMilliseconds += offsetStr.split(':')[1] * 60 * 1000;
    }
    milliseconds -= offsetMilliseconds;
    return new Date(milliseconds);
  },
  dhcpdStats = {
    srcData: null,
    chartData: null,
    parseJSON: function(s){
      var data = JSON.parse(s);
      return dhcpdStats.parseData(data);
    },
    parseData: function(data){
      var parsed = {};
      $.each(data, function(dtStr, dtVal){
        var dt = parseDateStr(dtStr);
        parsed[dt] = dtVal;
      });
      dhcpdStats.srcData = parsed;
      return parsed;
    },
    buildCharts: function(data){
      var chartContainer = $("#chart-container");
      if (typeof(data) == 'string'){
        dhcpdStats.parseJSON(data);
      } else if ($.isPlainObject(data)){
        dhcpdStats.parseData(data);
      }
      if (!dhcpdStats.srcData){
        throw 'No data exists';
      }
      dhcpdStats.chartData = {};
      $.each(dhcpdStats.srcData, function(dt, data){
        $.each(data, function(netKey, netData){
          var obj = new networkGraphicsData({'dataKey':netKey, data:dhcpdStats.srcData});
          dhcpdStats.chartData[netKey] = obj;
        });
        return false;
      });
      $.each(dhcpdStats.chartData, function(key, obj){
        var chartGroupDiv = $('<div class="row chart-group"></div>'),
            chData = obj.getAllValues();
        chartContainer.append(chartGroupDiv);
        $.each(chData, function(chKey, chVals){
          if (!chVals){
            return;
          }
          var chartDiv = $('<div class="col-xs-4 chart"></div>');
          chartDiv.attr('id', chKey);
          chartGroupDiv.append(chartDiv);
          MG.data_graphic({
            title:chKey.split('_').join(' '),
            target:'#' + chKey,
            data:chVals,
            x_accessor: 'date',
            y_accessor: 'value',
            full_width: true,
            full_height: true,
          });
        });
      });
    },
  },
  graphicsDataBase = Class.$extend({
    __init__: function(data){
      var self = this;
      self.name = data.name;
      self.dataKey = data.dataKey;
      self.parent = data.parent;
      self.dataKeyPath = self.getDataKeyPath();
      self.data = data.data;
      self._hasValue = true;
      if (typeof(self.data) == 'undefined'){
        self.data = self.parent.data;
      }
      self.children = {};
    },
    getDataKeyPath: function(){
      var self = this,
          keyPath;
      if (typeof(self.parent) == 'undefined'){
        keyPath = [];
      } else {
        keyPath = self.parent.getDataKeyPath();
      }
      if ($.isArray(self.dataKey)){
        Array.prototype.push.apply(keyPath, self.dataKey);
      } else {
        keyPath.push(self.dataKey);
      }
      return keyPath;
    },
    addChild: function(cls, data){
      var self = this,
          child;
      if (typeof(data) == 'undefined'){
        data = {};
      }
      data.parent = self;
      child = new cls(data);
      self.children[child.dataKey] = child;
      return child;
    },
    getHasValue: function(){
      return self._hasValue;
    },
    getValue: function(data){
      var self = this;
      $.each(self.dataKeyPath, function(i, key){
        data = data[key];
      });
      return data;
    },
    getAllValues: function(){
      var self = this,
          title = self.dataKeyPath.join(' '),
          el_id = title.split(' ').join('_').split('.').join('_'),
          values = {},
          myValues = null;
      if (self._hasValue){
        myValues = [];
        $.each(self.data, function(dt, data){
          var value = self.getValue(data);
          myValues.push({'date':new Date(dt), 'value':value});
        });
      }
      values[el_id] = myValues;
      $.each(self.children, function(key, child){
        $.extend(values, child.getAllValues());
      });
      return values;
    },
  }),
  networkGraphicsData = graphicsDataBase.$extend({
    __init__: function(data){
      var self = this;
      self.$super(data);
      self._hasValue = false;
      self.addChild(availableAddressData);
      $.each(self.data, function(dt, data){
        if (!self.name){
          self.name = data.name;
        }
        $.each(data[self.dataKey].subnets, function(subAddr, subData){
          $.each(subData.ranges, function(i, rangeData){
            self.addChild(rangeGraphicsData, {'dataKey':['subnets', subAddr, 'ranges', i]});
          });
        });
        return false;
      });
    },
  }),
  rangeGraphicsData = graphicsDataBase.$extend({
    __init__: function(data){
      var self = this;
      data.name = data.dataKey[0] + data.dataKey[1].toString;
      self.$super(data);
      self._hasValue = false;
      self.addChild(availableAddressData);
    },
  }),
  availableAddressData = graphicsDataBase.$extend({
    __init__: function(data){
      var self = this;
      data.dataKey = 'available_addresses';
      data.name = 'Available Addresses';
      self.$super(data);
    },
  });

window.dhcpdStats = dhcpdStats;
})(jQuery);