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

import { NavLink } from "react-router";
import {
  ComputerDesktopIcon,
  HomeIcon,
  RectangleStackIcon,
  ServerStackIcon,
} from "@heroicons/react/24/solid";
import { ReactNode, useContext } from "react";
import { TagIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { BotIcon } from "lucide-react";
import { UserContext } from "@/context/contexes";
// import { InboxStackIcon } from "@heroicons/react/24/solid";

function CoolNavLink({
  to,
  end,
  icon,
  linkText,
  alwaysActive = false,
}: {
  to: string;
  end?: boolean;
  icon: ReactNode;
  linkText: string;
  alwaysActive?: boolean;
}) {
  const user = useContext(UserContext);
  if (!user && !alwaysActive) {
    return (
      <div className="flex flex-col items-center my-2 ml-2 p-2 text-gray-500 ">
        <span className="block">{icon}</span>
        <span className="block text-xs">{linkText}</span>
      </div>
    );
  }
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        "flex flex-col items-center my-2 ml-2 p-2 " +
        (isActive ? " bg-slate-100 text-slate-900 rounded-l" : "")
      }
    >
      <span className="block">{icon}</span>
      <span className="block text-xs">{linkText}</span>
    </NavLink>
  );
}

export default function Menu() {
  return (
    <nav className="flex flex-col text-slate-200 py-2 min-w-28">
      <CoolNavLink
        to="/"
        end
        icon={<HomeIcon className="size-6" />}
        linkText="Home"
        alwaysActive={true}
      />
      <CoolNavLink
        to="/mcp-clients"
        icon={<ComputerDesktopIcon className="size-6" />}
        linkText="Clients"
      />
      <CoolNavLink
        to="/agents"
        icon={<BotIcon className="size-6" />}
        linkText="Agents"
      />
      <CoolNavLink
        to="/mcp-servers"
        icon={<ServerStackIcon className="size-6" />}
        linkText="Servers"
      />
      <CoolNavLink
        to="/users"
        icon={<UserGroupIcon className="size-6" />}
        linkText="Users"
      />
      <CoolNavLink
        to="/projects"
        icon={<RectangleStackIcon className="size-6" />}
        linkText="Projects"
      />
      <CoolNavLink
        to="/jwt-tokens"
        icon={<TagIcon className="size-6" />}
        linkText="Access tokens"
      />
    </nav>
  );
}
