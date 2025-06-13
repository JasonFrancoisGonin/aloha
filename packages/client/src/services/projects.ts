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

import { schemas } from "aloha-shared";
import { customFetch } from "./utils";

const apiProjectsUrl = "/api/project";

// Get all projects
export async function getProjectsList(): Promise<schemas.ProjectWithId[]> {
  const response = await customFetch("Get project list", `${apiProjectsUrl}/`);
  const data = await response.json();
  return data;
}

// Get project details by ID
export async function getProjectDetail(
  id: string
): Promise<schemas.ProjectWithId | null> {
  const response = await customFetch(
    "Get project detail",
    `${apiProjectsUrl}/${id}`
  );
  const data = await response.json();
  return data;
}

// Create a new project
export async function createProject(project: schemas.Project): Promise<void> {
  const response = await customFetch("Create project", apiProjectsUrl, {
    method: "POST",
    body: JSON.stringify(project),
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const data = await response.text();
    throw new Error(data);
  }
}

// Update project by ID
export async function updateProject(
  id: string,
  project: Partial<schemas.Project>
): Promise<void> {
  const response = await customFetch(
    "Update project",
    `${apiProjectsUrl}/${id}`,
    {
      method: "POST",
      body: JSON.stringify(project),
      headers: { "Content-Type": "application/json" },
    }
  );
  if (!response.ok) {
    const data = await response.text();
    throw new Error(data);
  }
}

// Delete project by ID
export async function deleteProject(id: string): Promise<void> {
  const response = await customFetch(
    "Delete project",
    `${apiProjectsUrl}/${id}/_delete`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }
  );
  await response.text();
}
