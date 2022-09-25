#!/usr/bin/env node

import CompilerCLI from './cli/CompilerCLI';
import { LogManager } from 'utils';

const main = () => {
    LogManager.to_log = true
    const ui = new CompilerCLI()
    ui.parse()
}

main()