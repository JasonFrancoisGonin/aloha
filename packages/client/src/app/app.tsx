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

import { Toaster } from "@/components/ui/sonner";
import Header from "../components/header";
import Menu from "../components/menu";
import Routing from "./routing";

export default function App() {
  return (
    <div className="bg-slate-900 min-h-full w-full flex flex-col">
      <Header />
      <div className="grow-1 flex">
        <Menu />
        <div className="grow-1 px-12 py-8 bg-slate-100 rounded-tl-xl">
          <Routing />
        </div>
      </div>
      <Toaster position="bottom-right" theme="light" />
    </div>
  );
}
