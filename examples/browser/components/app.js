// Copyright 2018 Canonical Ltd.
// Licensed under the LGPLv3, see LICENCE.txt file for details.

'use strict';

const bakery = require('macaroon-bakery');
const PropTypes = require('prop-types');
const React = require('react');
const shapeup = require('shapeup');

const monitor = require('../../../monitor');
const notes = require('../notes');
const Dashboard = require('./dashboard');
const Header = require('./header');
const StatusBar = require('./statusbar');
const {Col, Row} = require('./widgets');

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {loginURL: '', logs: [], notes: [], widgets: {}};

    this._addNote = this._addNote.bind(this);
    this._addLog = this._addLog.bind(this);
    this._addWidget = this._addWidget.bind(this);
    this._startMonitor = this._startMonitor.bind(this);
  }

  async componentDidMount() {
    const props = this.props;
    const options = {
      debug: props.options.debug,
      facades: props.options.facades,
      bakery: new bakery.Bakery({
        visitPage: resp => this.setState({loginURL: resp.Info.VisitURL}),
        onSuccess: () => this.setState({loginURL: ''})
      })
    };
    const ui = new notes.UI(this._addNote, this._addLog, this._addWidget);
    await this._startMonitor(options, ui);
  }

  async _startMonitor(options, ui) {
    const props = this.props;
    try {
      await monitor(props.url, options, props.checkers, ui);
    } catch (err) {
      ui.error(err);
    }
    setTimeout(() => {
      this._startMonitor(options, ui);
    }, 10000);
  }

  _addNote(note) {
    let found = false;
    const notes = this.state.notes.map(n => {
      if (n.key === note.key) {
        found = true;
        return note;
      }
      return n;
    });
    if (!found) {
      notes.push(note);
    }
    this.setState({notes: notes});
  }

  _addLog(msg) {
    const logs = this.state.logs.slice();
    logs.unshift(msg);
    this.setState({logs: logs.slice(0, 99)});
  }

  _addWidget(key, widget) {
    const state = this.state;
    const widgets = {};
    Object.keys(state.widgets).forEach(k => {
      widgets[k] = state.widgets[k].slice();
    });
    const value = widgets[key] || [];
    value.push(widget);
    widgets[key] = value;
    this.setState({widgets});
  }

  render() {
    const state = this.state;
    return (
      <div>
        <Header url={state.loginURL} />
        <Dashboard notes={state.notes} widgets={state.widgets} />
        <footer className="p-footer" id="footer">
          <StatusBar logs={state.logs} />
        </footer>
      </div>
    );
  }
}

App.propTypes = {
  checkers: PropTypes.array.isRequired,
  options: shapeup.shape({
    debug: PropTypes.bool,
    facades: PropTypes.array
  }).isRequired,
  url: PropTypes.string.isRequired
};

module.exports = App;
