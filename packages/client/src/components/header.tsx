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

import { UserContext } from "@/context/contexes";
import {
  UserIcon as NotLoggedIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { AuthenticationStrategy } from "aloha-shared";
import { useContext } from "react";
import { PATH_LOGIN, PATH_LOGOUT } from "../app/routing";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

function logout() {
  window.location.href = PATH_LOGOUT;
}

function login() {
  window.location.href = PATH_LOGIN;
}

export default function Header() {
  const user = useContext(UserContext);
  return (
    <div className=" p-2 pl-8 text-slate-200 flex justify-between items-center">
      <div className="text-3xl">A L O H A</div>
      {user == null || user.id == AuthenticationStrategy.ANONYMOUS_USER ? (
        <div className="flex cursor-pointer" onClick={() => login()}>
          <div className="italic mr-2">login</div>
          <NotLoggedIcon width={24} />
        </div>
      ) : (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex cursor-pointer">
                <div className="mr-2">{user?.displayName}</div>
                <UserCircleIcon width={24} />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>{user?.displayName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()}>
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>{" "}
        </>
      )}
    </div>
  );
}
