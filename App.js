Ext.define('Rally.ui.bulk.RecordMenuFix', {
    override: 'Rally.ui.menu.bulk.RecordMenu',
    _getMenuItems: function() {
        var records = this.getRecords();
        var items = this.callParent(arguments);
        items.push({
             xtype: 'wsjfBulkSetRisk',
             id: 'wsjfBulkSetRisk'
         });
        items.push({
             xtype: 'wsjfBulkSetValue',
             id: 'wsjfBulkSetValue'
        });
        items.push({
             xtype: 'wsjfBulkSetTime',
             id: 'wsjfBulkSetTime'
        });

        _.each(items, function (item) {
            Ext.apply(item, {
                records: records,
                store: this.store,
                onBeforeAction: this.onBeforeAction,
                onActionComplete: this.onActionComplete,
                context: this.getContext()
            });
        }, this);

        return items;
     }
});


Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    launch: function() {

        var grid = Ext.create('Rally.ui.grid.Grid', {
            id: 'piGrid',
            margin: 30,
            columnCfgs: [
                'FormattedID',
                'Name',
                'Project',
                'JobSize',
                'RROEValue',
                'TimeCriticality',
                'UserBusinessValue',
                'WSJFScore'
            ],
            bulkEditConfig: {
                showEdit: false,
                showTag: false,
                showParent: false,
                showRemove: false
            },
            context: this.getContext(),
            enableBulkEdit: true,
            enableRanking: true,
            storeConfig: {
                model: 'portfolioitem/initiative',
                sorters: {
                    property: 'wsjfScore',
                    direction: 'DESC'
                },
                fetch: ['FormattedID', 'Name', 'Project', 'JobSize', 'RROEValue', 'TimeCriticality', 'UserBusinessValue', 'WSJFScore']
            },
            sortableColumns: false, //We will auto sort on WSJF number,
            listeners: {
                inlineeditsaved: function( grid, record, opts) {
                    record.set('WSJFScore', (record.get('RROEValue') + record.get('UserBusinessValue') + record.get('TimeCriticality'))/record.get('JobSize'));
                    record.save( {
                        callback: function() {
                            Ext.getCmp('piGrid').refresh();
                        }
                    });
                }
            }

        });

        //Ext.util.Observable.capture( grid, function(event) { console.log(event, arguments);});

        this.add(grid);

        var picard = Ext.create('Ext.Container', {
            layout: {
                type: 'vbox',
                align: 'center'
            },
            items: [{
                xtype: 'rallybutton',
                text: 'Commit',
                handler:  function() {

                    var store = Ext.getCmp('piGrid').store;

//                    Rally.data.Ranker.rankToTop(store.data.items[0], this.getRankScope());
                    var rankingRecord = store.data.items[0];

    debugger;
                    _.each(store.data.items, function(item) {
                        var rankConfig = Rally.data.Ranker.generateRankParameters( { relativeRecord: rankingRecord, position: 'after' });
                        rankingRecord = item;

                        Rally.data.Ranker.rankRelative( {
                            recordToRank: item,
                            relativeRecord: store.data.items[0],
                            position: 'after'
                        });
                    })
                }
            }]
        });

        this.add(picard);
    }
});

Ext.define('riskModel', {
    extend: 'Ext.data.Model',
    fields: [
        {name: 'Name',  type: 'string'  },
        {name: 'Value', type: 'integer' }
    ]
});


Ext.define('wsjfBulkSetRisk', {
    extend:  Rally.ui.menu.bulk.MenuItem ,
    alias: 'widget.wsjfBulkSetRisk',

    config: {
        text: 'Risk',
        handler: function(arg1, arg2, arg3) {
            this._onSetRisk(arg1, arg2, arg3);
        }
    },

    _onSetRisk: function(arg1, arg2, arg3) {
        var data = {
            riskValues: [
                { 'Name':'None', 'Value': 1 },
                { 'Name':'Minimal', 'Value': 3 },
                { 'Name':'Low', 'Value': 5 },
                { 'Name':'Medium', 'Value': 8 },
                { 'Name':'High', 'Value': 13 },
                { 'Name':'Extreme', 'Value': 21 }
            ]
        };

        var store = Ext.create('Ext.data.Store', {
            autoLoad: true,
            model: 'riskModel',
            data: data,
            proxy: {
                type: 'memory',
                reader: {
                    type: 'json',
                    root: 'riskValues'
                }
            }
        });

        var riskBox = Ext.create( 'Ext.form.ComboBox', {
            id: 'riskBox',
            store: store,
            queryMode: 'local',
            displayField: 'Name',
            valueField: 'Value'
        });

        var doChooser = Ext.create( 'Rally.ui.dialog.Dialog', {
            id: 'riskChooser',
            autoShow: true,
            draggable: true,
            width: 300,
            records: this.records,
            title: 'Choose Risk setting',
            items: riskBox,
            buttons: [
                {   text: 'OK',
                    handler: function(arg1, arg2, arg3) {
                        _.each(this.records, function(record) {
                            record.set('RROEValue', Ext.getCmp('riskBox').value);
                            record.set('WSJFScore', //
                                (record.get('RROEValue') + record.get('UserBusinessValue') + record.get('TimeCriticality'))/record.get('JobSize')
                          //
                            );
                            record.save( {
                                    callback: function() {
                                        Ext.getCmp('riskChooser').destroy();
                                        Ext.getCmp('piGrid').refresh();
                                    }
                            });
                        });
                    },
                    scope: this
                }
            ]
        });
    }
});

Ext.define('wsjfBulkSetValue', {
    extend:  Rally.ui.menu.bulk.MenuItem ,
    alias: 'widget.wsjfBulkSetValue',

    config: {
        text: 'Value',
        handler: function() {
            this._onSetValue();
        }
    },

    _onSetValue: function() {
        var valueValues = Ext.create('Ext.data.Store', {
            fields: ['Name', 'Value'],
            data: [
                { 'Name':'None', 'Value': 1 },
                { 'Name':'Minimal', 'Value': 3 },
                { 'Name':'Low', 'Value': 5 },
                { 'Name':'Medium', 'Value': 8 },
                { 'Name':'High', 'Value': 13 },
                { 'Name':'Extreme', 'Value': 21 }
            ]
        });

    }
});

Ext.define('wsjfBulkSetTime', {
    extend:  Rally.ui.menu.bulk.MenuItem ,
    alias: 'widget.wsjfBulkSetTime',

    config: {
        text: 'Time',
        handler: function() {
            this._onSetTime();
        }
    },

    _onSetTime: function() {
        var timeValues = Ext.create('Ext.data.Store', {
            fields: ['Name', 'Value'],
            data: [
                { 'Name':'None', 'Value': 1 },
                { 'Name':'Minimal', 'Value': 3 },
                { 'Name':'Low', 'Value': 5 },
                { 'Name':'Medium', 'Value': 8 },
                { 'Name':'High', 'Value': 13 },
                { 'Name':'Extreme', 'Value': 21 }
            ]
        });
    }
});