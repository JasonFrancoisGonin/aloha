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

import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// animation timing constants
const TYPING_SPEED_MS = 50;
const PAUSE_DURATION_MS = 3000;
const DELETING_SPEED_MS = 15;

interface ChatInputProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  animatedPlaceholderExamples?: string[];
}

const ChatInput = React.forwardRef<HTMLTextAreaElement, ChatInputProps>(
  ({ className, animatedPlaceholderExamples, ...props }, ref) => {
    const [currentPlaceholder, setCurrentPlaceholder] = React.useState(
      props.placeholder || ""
    );

    const exampleIndexRef = React.useRef(0);
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const isDeletingRef = React.useRef(false);

    const isAnimationEnabled =
      animatedPlaceholderExamples && animatedPlaceholderExamples.length > 0;

    React.useEffect(() => {
      if (!isAnimationEnabled) {
        setCurrentPlaceholder(props.placeholder || "");
        return;
      }

      const examples = animatedPlaceholderExamples;

      const animatePlaceholder = () => {
        const fullExampleText = examples[exampleIndexRef.current];
        const updatedText = isDeletingRef.current
          ? fullExampleText.substring(0, currentPlaceholder.length - 1)
          : fullExampleText.substring(0, currentPlaceholder.length + 1);

        setCurrentPlaceholder(updatedText);

        let delay = isDeletingRef.current ? DELETING_SPEED_MS : TYPING_SPEED_MS;

        if (!isDeletingRef.current && updatedText === fullExampleText) {
          isDeletingRef.current = true;
          delay = PAUSE_DURATION_MS;
        } else if (isDeletingRef.current && updatedText === "") {
          isDeletingRef.current = false;
          exampleIndexRef.current =
            (exampleIndexRef.current + 1) % examples.length;
        }

        timeoutRef.current = setTimeout(animatePlaceholder, delay);
      };

      timeoutRef.current = setTimeout(animatePlaceholder, TYPING_SPEED_MS);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, [
      animatedPlaceholderExamples,
      isAnimationEnabled,
      props.placeholder,
      currentPlaceholder.length,
    ]);

    return (
      <Textarea
        autoComplete="off"
        ref={ref}
        name="message"
        className={cn(
          "max-h-12 px-4 py-3 bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 w-full rounded-md flex items-center h-16 resize-none",
          className
        )}
        placeholder={
          isAnimationEnabled ? currentPlaceholder : props.placeholder
        }
        {...props}
      />
    );
  }
);
ChatInput.displayName = "ChatInput";

export { ChatInput };
