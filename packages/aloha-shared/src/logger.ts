/*
Copyright (C) 2025 European Union
 
Licensed under the EUPL, Version 1.2 or – as soon they will be approved by the
European Commission – subsequent versions of the EUPL (the “Licence”);
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at:
* https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12 *

Unless required by applicable law or agreed to in writing, software distributed under
the Licence is distributed on an “AS IS” basis, WITHOUT WARRANTIES OR CONDITIONS
OF ANY KIND, either express or implied. See the Licence for the specific language
governing permissions and limitations under the Licence.
*/

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Logger {
  child(context: unknown): Logger;
  fatal(msg: unknown, ...args: any[]): void;
  error(msg: unknown, ...args: any[]): void;
  warn(msg: unknown, ...args: any[]): void;
  info(msg: unknown, ...args: any[]): void;
  debug(msg: unknown, ...args: any[]): void;
  trace(msg: unknown, ...args: any[]): void;
}

export class ConsoleLogger implements Logger {
  private context: unknown = "";
  child(context: unknown): Logger {
    this.context = context;
    return this;
  }
  fatal(msg: unknown, ...args: any[]): void {
    console.error(this.context, msg, args);
  }
  error(msg: unknown, ...args: any[]): void {
    console.error(this.context, msg, args);
  }
  warn(msg: unknown, ...args: any[]): void {
    console.warn(this.context, msg, args);
  }
  info(msg: unknown, ...args: any[]): void {
    console.info(this.context, msg, args);
  }
  debug(msg: unknown, ...args: any[]): void {
    console.debug(this.context, msg, args);
  }
  trace(msg: unknown, ...args: any[]): void {
    console.trace(this.context, msg, args);
  }
}
