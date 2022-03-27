#!/usr/bin/env node

import CompilerCLI from './cli/CompilerCLI';

const main = () => {
    const ui = new CompilerCLI()
    ui.parse()
}

main()