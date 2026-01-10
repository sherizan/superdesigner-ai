#!/usr/bin/env node

/**
 * Superdesigner CLI entry point.
 */

import { run } from '../core/cli/index.mjs';

run(process.argv.slice(2));
