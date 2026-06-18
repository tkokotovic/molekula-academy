import { createContext, useContext } from 'react';

// Shared context so any TiptapEditor can register itself as the active editor
// when focused — without prop-drilling through the entire NotionBlock tree.
// Value: { setActive(editor | null) }
export const ActiveEditorContext = createContext(null);
export const useActiveEditorCtx = () => useContext(ActiveEditorContext);
