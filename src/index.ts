#!/usr/bin/env node

import CompilerCLI from './cli/CompilerCLI';
import { LogManager } from 'utils';
import { COMPILER_CONFIG } from './config/CompilerConfig';

const main = () => {
    const ui = new CompilerCLI()
    ui.parse()
}

main()