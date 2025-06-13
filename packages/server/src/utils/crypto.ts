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

import crypto from "crypto";

function deriveKey(key: string) {
  return crypto.createHash("sha512").update(key).digest("hex").substring(0, 32);
}

export function encrypt(plaintext: string, key: string) {
  const iv = crypto.randomBytes(16);
  key = deriveKey(key);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([
    iv,
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return encrypted.toString("base64url");
}

export function decrypt(ivCiphertextB64: string, key: string) {
  const ivCiphertext = Buffer.from(ivCiphertextB64, "base64url");
  const iv = ivCiphertext.subarray(0, 16);
  const ciphertext = ivCiphertext.subarray(16);
  key = deriveKey(key);
  const cipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  const decrypted = Buffer.concat([cipher.update(ciphertext), cipher.final()]);
  return decrypted.toString("utf-8");
}
