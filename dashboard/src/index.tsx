import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import AppData from './AppData';
import {logConsoleMessage} from './console_message';

logConsoleMessage();

ReactDOM.render(<AppData />, document.getElementById('root'));
