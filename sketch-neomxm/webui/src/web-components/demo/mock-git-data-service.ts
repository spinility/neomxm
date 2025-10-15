// mock-git-data-service.ts
// Mock implementation of GitDataService for the demo environment

import { GitDataService, GitDiffFile } from "../git-data-service";
import { GitLogEntry } from "../../types";

/**
 * Demo implementation of GitDataService with canned responses
 */
export class MockGitDataService implements GitDataService {
  constructor() {
    console.log("MockGitDataService instance created");
    // Setup mock push endpoints when service is created
    setupMockPushEndpoints();
  }

  // Mock commit history
  private mockCommits: GitLogEntry[] = [
    {
      hash: "abc123456789",
      subject: "Implement new file picker UI",
      refs: ["HEAD", "origin/main", "refs/heads/feature/file-picker"],
    },
    {
      hash: "def987654321",
      subject: "Add range picker component and improve styling",
      refs: [
        "origin/feature/range-picker",
        "refs/heads/feature/ui-improvements",
        "refs/remotes/origin/dev",
      ],
    },
    {
      hash: "ghi456789123",
      subject: "Fix styling issues in navigation and add responsive design",
      refs: ["refs/heads/hotfix/styling", "refs/tags/v1.2.0"],
    },
    {
      hash: "jkl789123456",
      subject: "Initial commit",
      refs: ["sketch-base"],
    },
  ];

  // Mock diff files for various scenarios
  private mockDiffFiles: GitDiffFile[] = [
    {
      path: "src/components/FilePicker.js",
      old_path: "",
      status: "A",
      new_mode: "100644",
      old_mode: "000000",
      old_hash: "0000000000000000000000000000000000000000",
      new_hash: "def0123456789abcdef0123456789abcdef0123",
      additions: 54,
      deletions: 0,
    },
    {
      path: "src/components/RangePicker.js",
      old_path: "",
      status: "A",
      new_mode: "100644",
      old_mode: "000000",
      old_hash: "0000000000000000000000000000000000000000",
      new_hash: "cde0123456789abcdef0123456789abcdef0123",
      additions: 32,
      deletions: 0,
    },
    {
      path: "src/components/App.js",
      old_path: "",
      status: "M",
      new_mode: "100644",
      old_mode: "100644",
      old_hash: "abc0123456789abcdef0123456789abcdef0123",
      new_hash: "bcd0123456789abcdef0123456789abcdef0123",
      additions: 15,
      deletions: 3,
    },
    {
      path: "src/components/DialogPicker.js",
      old_path: "src/components/FilePicker.js",
      status: "C85",
      new_mode: "100644",
      old_mode: "100644",
      old_hash: "def0123456789abcdef0123456789abcdef0123",
      new_hash: "hij0123456789abcdef0123456789abcdef0123",
      additions: 8,
      deletions: 2,
    },
    {
      path: "src/components/RangeSelector.js",
      old_path: "src/components/RangePicker.js",
      status: "R95",
      new_mode: "100644",
      old_mode: "100644",
      old_hash: "cde0123456789abcdef0123456789abcdef0123",
      new_hash: "klm0123456789abcdef0123456789abcdef0123",
      additions: 5,
      deletions: 3,
    },
    {
      path: "src/styles/main.css",
      old_path: "",
      status: "M",
      new_mode: "100644",
      old_mode: "100644",
      old_hash: "fgh0123456789abcdef0123456789abcdef0123",
      new_hash: "ghi0123456789abcdef0123456789abcdef0123",
      additions: 25,
      deletions: 8,
    },
  ];

  // Mock file content for different files and commits
  private appJSOriginal = `function App() {
  return (
    <div className="app">
      <header>
        <h1>Git Diff Viewer</h1>
      </header>
      <main>
        <p>Select a file to view differences</p>
      </main>
    </div>
  );
}`;

  private appJSModified = `function App() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Load commits and files
  useEffect(() => {
    // Code to load commits would go here
    // setCommits(...);
  }, []);
  
  return (
    <div className="app">
      <header>
        <h1>Git Diff Viewer</h1>
      </header>
      <main>
        <FilePicker files={files} onFileSelect={setSelectedFile} />
        <div className="diff-view">
          {selectedFile ? (
            <div>Diff view for {selectedFile.path}</div>
          ) : (
            <p>Select a file to view differences</p>
          )}
        </div>
      </main>
    </div>
  );
}`;

  private filePickerJS = `function FilePicker({ files, onFileSelect }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  useEffect(() => {
    // Reset selection when files change
    setSelectedIndex(0);
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [files, onFileSelect]);
  
  const handleNext = () => {
    if (selectedIndex < files.length - 1) {
      const newIndex = selectedIndex + 1;
      setSelectedIndex(newIndex);
      onFileSelect(files[newIndex]);
    }
  };
  
  const handlePrevious = () => {
    if (selectedIndex > 0) {
      const newIndex = selectedIndex - 1;
      setSelectedIndex(newIndex);
      onFileSelect(files[newIndex]);
    }
  };
  
  return (
    <div className="file-picker">
      <select value={selectedIndex} onChange={(e) => {
        const index = parseInt(e.target.value, 10);
        setSelectedIndex(index);
        onFileSelect(files[index]);
      }}>
        {files.map((file, index) => (
          <option key={file.path} value={index}>
            {file.status} {file.path}
          </option>
        ))}
      </select>
      
      <div className="navigation-buttons">
        <button 
          onClick={handlePrevious} 
          disabled={selectedIndex === 0}
        >
          Previous
        </button>
        <button 
          onClick={handleNext} 
          disabled={selectedIndex === files.length - 1}
        >
          Next
        </button>
      </div>
    </div>
  );
}`;

  private rangePickerJS = `function RangePicker({ commits, onRangeChange }) {
  const [rangeType, setRangeType] = useState('range');
  const [startCommit, setStartCommit] = useState(commits[0]);
  const [endCommit, setEndCommit] = useState(commits[commits.length - 1]);

  const handleTypeChange = (e) => {
    setRangeType(e.target.value);
    if (e.target.value === 'single') {
      onRangeChange({ type: 'single', commit: startCommit });
    } else {
      onRangeChange({ type: 'range', from: startCommit, to: endCommit });
    }
  };

  return (
    <div className="range-picker">
      <div className="range-type-selector">
        <label>
          <input 
            type="radio" 
            value="range" 
            checked={rangeType === 'range'} 
            onChange={handleTypeChange} 
          />
          Commit Range
        </label>
        <label>
          <input 
            type="radio" 
            value="single" 
            checked={rangeType === 'single'} 
            onChange={handleTypeChange} 
          />
          Single Commit
        </label>
      </div>
    </div>
  );
}`;

  private dialogPickerJS = `function DialogPicker({ files, onFileSelect, onClose }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  
  // Similar to FilePicker but with modal dialog functionality
  useEffect(() => {
    setSelectedIndex(0);
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [files, onFileSelect]);
  
  return (
    <div className="dialog-picker">
      <button onClick={() => setShowDialog(true)}>
        Open File Dialog
      </button>
      {showDialog && (
        <div className="modal-overlay" onClick={() => setShowDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Select File</h3>
            <select value={selectedIndex} onChange={(e) => {
              const index = parseInt(e.target.value, 10);
              setSelectedIndex(index);
              onFileSelect(files[index]);
            }}>
              {files.map((file, index) => (
                <option key={file.path} value={index}>
                  {file.status} {file.path}
                </option>
              ))}
            </select>
            <div className="modal-buttons">
              <button onClick={() => setShowDialog(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`;

  private rangeSelectorJS = `function RangeSelector({ commits, onRangeChange, allowCustomRange = true }) {
  const [rangeType, setRangeType] = useState('range');
  const [startCommit, setStartCommit] = useState(commits[0]);
  const [endCommit, setEndCommit] = useState(commits[commits.length - 1]);
  const [customRange, setCustomRange] = useState('');

  const handleTypeChange = (e) => {
    setRangeType(e.target.value);
    if (e.target.value === 'single') {
      onRangeChange({ type: 'single', commit: startCommit });
    } else if (e.target.value === 'custom' && customRange) {
      onRangeChange({ type: 'custom', range: customRange });
    } else {
      onRangeChange({ type: 'range', from: startCommit, to: endCommit });
    }
  };

  return (
    <div className="range-selector">
      <div className="range-type-selector">
        <label>
          <input 
            type="radio" 
            value="range" 
            checked={rangeType === 'range'} 
            onChange={handleTypeChange} 
          />
          Commit Range
        </label>
        <label>
          <input 
            type="radio" 
            value="single" 
            checked={rangeType === 'single'} 
            onChange={handleTypeChange} 
          />
          Single Commit
        </label>
        {allowCustomRange && (
          <label>
            <input 
              type="radio" 
              value="custom" 
              checked={rangeType === 'custom'} 
              onChange={handleTypeChange} 
            />
            Custom Range
          </label>
        )}
      </div>
      {rangeType === 'custom' && (
        <input 
          type="text" 
          placeholder="Enter custom range (e.g., HEAD~5..HEAD)"
          value={customRange}
          onChange={(e) => setCustomRange(e.target.value)}
        />
      )}
    </div>
  );
}`;

  private mainCSSOriginal = `body {
  font-family: sans-serif;
  margin: 0;
  padding: 0;
}

.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

header {
  margin-bottom: 20px;
}

h1 {
  color: #333;
}`;

  private mainCSSModified = `body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  margin: 0;
  padding: 0;
  background-color: #f5f5f5;
}

.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

header {
  margin-bottom: 20px;
  border-bottom: 1px solid #ddd;
  padding-bottom: 10px;
}

h1 {
  color: #333;
}

.file-picker {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 20px;
}

.file-picker select {
  flex: 1;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.navigation-buttons {
  display: flex;
  gap: 8px;
}

button {
  padding: 8px 12px;
  background-color: #4a7dfc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}`;

  async getCommitHistory(initialCommit?: string): Promise<GitLogEntry[]> {
    console.log(
      `[MockGitDataService] Getting commit history from ${initialCommit || "beginning"}`,
    );

    // If initialCommit is provided, return commits from that commit to HEAD
    if (initialCommit) {
      const startIndex = this.mockCommits.findIndex(
        (commit) => commit.hash === initialCommit,
      );
      if (startIndex >= 0) {
        return this.mockCommits.slice(0, startIndex + 1);
      }
    }

    return [...this.mockCommits];
  }

  async getDiff(from: string, to: string): Promise<GitDiffFile[]> {
    console.log(`[MockGitDataService] Getting diff from ${from} to ${to}`);

    return [...this.mockDiffFiles];
  }

  async getCommitDiff(commit: string): Promise<GitDiffFile[]> {
    console.log(`[MockGitDataService] Getting diff for commit ${commit}`);

    // Return a subset of files for specific commits
    if (commit === "abc123456789") {
      return this.mockDiffFiles.slice(0, 2);
    } else if (commit === "def987654321") {
      return this.mockDiffFiles.slice(1, 3);
    }

    // For other commits, return all files
    return [...this.mockDiffFiles];
  }

  async getFileContent(fileHash: string): Promise<string> {
    console.log(
      `[MockGitDataService] Getting file content for hash: ${fileHash}`,
    );

    // Return different content based on the file hash
    if (fileHash === "bcd0123456789abcdef0123456789abcdef0123") {
      return this.appJSModified;
    } else if (fileHash === "abc0123456789abcdef0123456789abcdef0123") {
      return this.appJSOriginal;
    } else if (fileHash === "def0123456789abcdef0123456789abcdef0123") {
      return this.filePickerJS;
    } else if (fileHash === "cde0123456789abcdef0123456789abcdef0123") {
      return this.rangePickerJS;
    } else if (fileHash === "hij0123456789abcdef0123456789abcdef0123") {
      return this.dialogPickerJS;
    } else if (fileHash === "klm0123456789abcdef0123456789abcdef0123") {
      return this.rangeSelectorJS;
    } else if (fileHash === "ghi0123456789abcdef0123456789abcdef0123") {
      return this.mainCSSModified;
    } else if (fileHash === "fgh0123456789abcdef0123456789abcdef0123") {
      return this.mainCSSOriginal;
    }

    // Return empty string for unknown file hashes
    return "";
  }

  async getBaseCommitRef(): Promise<string> {
    console.log("[MockGitDataService] Getting base commit ref");

    // Find the commit with the sketch-base ref
    const baseCommit = this.mockCommits.find(
      (commit) => commit.refs && commit.refs.includes("sketch-base"),
    );

    if (baseCommit) {
      return baseCommit.hash;
    }

    // Fallback to the last commit in our list
    return this.mockCommits[this.mockCommits.length - 1].hash;
  }

  // Helper to simulate network delay
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getWorkingCopyContent(filePath: string): Promise<string> {
    console.log(
      `[MockGitDataService] Getting working copy content for path: ${filePath}`,
    );

    // Return different content based on the file path
    if (filePath === "src/components/App.js") {
      return this.appJSModified;
    } else if (filePath === "src/components/FilePicker.js") {
      return this.filePickerJS;
    } else if (filePath === "src/components/RangePicker.js") {
      return this.rangePickerJS;
    } else if (filePath === "src/components/DialogPicker.js") {
      return this.dialogPickerJS;
    } else if (filePath === "src/components/RangeSelector.js") {
      return this.rangeSelectorJS;
    } else if (filePath === "src/styles/main.css") {
      return this.mainCSSModified;
    }

    // Return empty string for unknown file paths
    return "";
  }

  async getUnstagedChanges(from: string = "HEAD"): Promise<GitDiffFile[]> {
    console.log(`[MockGitDataService] Getting unstaged changes from ${from}`);

    // Create a new array of files with 0000000... as the new hashes
    // to simulate unstaged changes
    return this.mockDiffFiles.map((file) => ({
      ...file,
      new_hash: "0000000000000000000000000000000000000000",
    }));
  }

  async saveFileContent(filePath: string, content: string): Promise<void> {
    console.log(
      `[MockGitDataService] Saving file content for path: ${filePath}`,
    );
    // Simulate a network delay
    await this.delay(500);
    // In a mock implementation, we just log the save attempt
    console.log(
      `File would be saved: ${filePath} (${content.length} characters)`,
    );
    // Return void as per interface
  }

  async getUntrackedFiles(): Promise<string[]> {
    console.log("[MockGitDataService] Getting untracked files");
    // Return some mock untracked files for demo purposes
    return [
      "temp.txt",
      "debug.log",
      "config/local.json",
      "node_modules/.cache/something",
    ];
  }
}

// Mock HTTP endpoints for push demo
export function setupMockPushEndpoints() {
  // Mock the git/pushinfo endpoint
  const originalFetch = window.fetch;

  window.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
    const urlString = typeof url === "string" ? url : url.toString();

    // Mock pushinfo endpoint
    if (urlString.includes("/git/pushinfo")) {
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay

      return new Response(
        JSON.stringify({
          hash: "abc123456789",
          subject: "Implement new file picker UI",
          remotes: [
            {
              name: "origin",
              url: "https://github.com/boldsoftware/bold.git",
              display_name: "boldsoftware/bold",
              is_github: true,
            },
            {
              name: "gitlab",
              url: "https://gitlab.com/testuser/bold.git",
              display_name: "gitlab.com/testuser/bold",
              is_github: false,
            },
            {
              name: "selfhosted",
              url: "https://git.company.com/team/bold.git",
              display_name: "git.company.com/team/bold",
              is_github: false,
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Mock push endpoint
    if (urlString.includes("/git/push")) {
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate push delay

      const body = init?.body ? JSON.parse(init.body as string) : {};
      const isDryRun = body.dry_run || false;

      const mockOutput = isDryRun
        ? `To https://github.com/boldsoftware/bold.git\n   abc1234..def5678  ${body.branch || "main"} -> ${body.branch || "main"} (dry-run)`
        : `To https://github.com/boldsoftware/bold.git\n   abc1234..def5678  ${body.branch || "main"} -> ${body.branch || "main"}\n\nCreate a pull request for '${body.branch || "main"}' on GitHub by visiting:\n  https://github.com/boldsoftware/bold/pull/new/${body.branch || "main"}`;

      return new Response(
        JSON.stringify({
          success: true,
          output: mockOutput,
          dry_run: isDryRun,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Fall back to original fetch for other requests
    return originalFetch(url, init);
  };
}
