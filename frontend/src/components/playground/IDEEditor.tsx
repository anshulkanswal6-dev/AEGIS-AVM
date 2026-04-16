import Editor, { loader } from '@monaco-editor/react';
import { cn } from '../../lib/utils/cn';
import { useThemeStore } from '../../hooks/useTheme';

// CRITICAL: Prevent duplicate Monaco loading which causes "Duplicate definition of module" errors
loader.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.43.0/min/vs' } });

interface IDEEditorProps {
  id: string; // Unique ID to force re-render
  value: string;
  language: string;
  onChange?: (val: string) => void;
  onCursorChange?: (pos: { line: number, column: number }) => void;
  className?: string;
}

export function IDEEditor({ id, value, language, onChange, onCursorChange, className }: IDEEditorProps) {
  const { resolvedTheme } = useThemeStore();
  const editorTheme = resolvedTheme === 'dark' ? 'vs-dark' : 'vs';

  // Map internal language names to Monaco-supported IDs
  const monacoLanguage = language === 'python' ? 'python' : 
                        language === 'json' ? 'json' : 
                        language === 'markdown' ? 'markdown' :
                        language === 'typescript' ? 'typescript' :
                        language === 'javascript' ? 'javascript' :
                        language === 'css' ? 'css' :
                        language === 'html' ? 'html' : 'python';

  const handleEditorDidMount = (editor: any, monaco: any) => {
    // CRITICAL: Force set the model language to ensure IntelliSense loads for the correct file type
    if (editor.getModel()) {
      monaco.editor.setModelLanguage(editor.getModel(), monacoLanguage);
    }

    // Configure JSON
    if (monacoLanguage === 'json' && monaco.languages.json) {
      monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        allowComments: true,
        schemas: []
      });
    }

    // Track cursor position
    editor.onDidChangeCursorPosition((e: any) => {
      if (onCursorChange) {
        onCursorChange({
          line: e.position.lineNumber,
          column: e.position.column
        });
      }
    });

    // Report initial position on mount
    onCursorChange?.({ line: 1, column: 1 });
  };

  return (
    <div className={cn(
      "flex-1 flex flex-col relative z-10 th-surface",
      className
    )}>
      <Editor
        key={id} // CRITICAL: Forces Monaco to re-sync language model on file switch
        height="100%"
        path={id} // Helps Monaco infer language specifics from 'path'
        language={monacoLanguage}
        defaultLanguage={monacoLanguage}
        value={value || ""}
        theme={editorTheme}
        onChange={(val) => onChange?.(val || "")}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: '"Fira Code", "Fira Mono", "Cascadia Code", "Source Code Pro", Menlo, Monaco, Consolas, "Courier New", monospace',
          fontWeight: '600',
          lineNumbers: 'on',
          roundedSelection: true,
          scrollBeyondLastLine: false,
          readOnly: false,
          cursorStyle: 'line',
          automaticLayout: true,
          padding: { top: 12, bottom: 12 },
          quickSuggestions: {
            other: true,
            comments: true,
            strings: true
          },
          suggest: {
            showWords: true,
            showSnippets: true,
            showKeywords: true,
            showClasses: true,
            showFunctions: true,
            showVariables: true,
            showMethods: true
          },
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: 'on',
          snippetSuggestions: 'top',
          tabSize: 4,
          renderLineHighlight: 'all',
          bracketPairColorization: { enabled: true },
          colorDecorators: true,
          wordBasedSuggestions: 'allDocuments',
          parameterHints: { enabled: true },
          suggestSelection: 'recentlyUsed',
          tabCompletion: 'on',
          formatOnType: true,
          formatOnPaste: true,
          fixedOverflowWidgets: true,
          scrollbar: {
             vertical: 'visible',
             horizontal: 'visible',
             useShadows: false,
             verticalScrollbarSize: 10,
             horizontalScrollbarSize: 10
          }
        }}
        loading={
          <div className="flex-1 flex items-center justify-center th-surface th-text-tertiary font-mono text-xs uppercase tracking-widest">
            Initializing Engine...
          </div>
        }
      />
    </div>
  );
}
