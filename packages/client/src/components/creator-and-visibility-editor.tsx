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

import { getUserDetail } from "@/services/users";
import { CreatorServiceFunc, VisibilityServiceFunc } from "@/services/utils";
import { schemas } from "aloha-shared";
import { useEffect, useState } from "react";
import { CreatorEditDialog } from "./creator-edit-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import VisibilityEditDialog from "./visibility-edit-dialog";

type Props = {
  item: Partial<schemas.VisibilityInterface> & schemas.WithIdBase;
  name: string;
  setCreatorService: CreatorServiceFunc;
  setVisibilityService: VisibilityServiceFunc;
  onAccept?: () => Promise<void>;
};

function capitalize(v: schemas.Visibility | undefined) {
  if (!v) {
    return "";
  }
  return v.substring(0, 1).toUpperCase() + v.substring(1);
}
export function CreatorAndVisibilityEditor({
  item,
  name,
  setCreatorService,
  setVisibilityService,
  onAccept,
}: Props) {
  const [creatorUser, setCreatorUser] = useState<schemas.UserWithId | null>(
    null
  );
  useEffect(() => {
    const fetchUser = async () => {
      if (item.creator) {
        const user = await getUserDetail(item.creator);
        setCreatorUser(user);
      }
    };

    fetchUser();
  }, [item, item.creator]);

  return (
    <>
      <Card className="w-full max-w-fit">
        <CardHeader>
          <CardTitle>Ownership &amp; Visibility</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="inline-grid grid-cols-3 gap-x-4 gap-y-2 items-center">
            Owner:{" "}
            <span className="italic ">
              {creatorUser?.fullName ?? (
                <span className="text-red-500 font-bold">Unknown user</span>
              )}
            </span>
            <CreatorEditDialog
              name={name}
              objectId={item.id}
              currentCreatorId={item.creator}
              setCreatorService={setCreatorService}
              onAccept={onAccept}
            />
            Visibility:{" "}
            <span className="italic">{capitalize(item.visibility)}</span>
            {!("isError" in item) && item.creator && (
              <VisibilityEditDialog
                name={name}
                editService={setVisibilityService}
                visibilityObject={{
                  id: item.id,
                  creator: item.creator,
                  visibility: item.visibility || schemas.Visibility.Private,
                  projects: item.projects,
                }}
                onAccept={onAccept}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
