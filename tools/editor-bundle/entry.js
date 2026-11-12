// The CodeMirror pieces the OnBot Java-style editor uses.
export { EditorState, StateField, StateEffect, RangeSet, Compartment } from "@codemirror/state";
export { EditorView, ViewPlugin, Decoration, GutterMarker, keymap, lineNumbers, gutterLineClass, highlightSpecialChars, drawSelection } from "@codemirror/view";
export { history, historyKeymap, defaultKeymap, undo, redo, indentLess } from "@codemirror/commands";
