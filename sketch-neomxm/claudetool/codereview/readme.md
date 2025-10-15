This somewhat sprawling tool handles code-oriented cleanups.

It is often easier to find and fix code issues than attempt to prompt engineer them to never occur, particularly for mechanically detectable issues and issues around particular APIs, etc.

The tool gets run whenever a git commit occurs.

There are three different types of code reviews that this tool does.

(This is not well reflected in the code organization yet.)

# Mechanical

The simplest are high confidence code issues that can be cleaned up reliably and mechanically, such as running gofmt.

Detection of these is based on the current state of the repository and which files have changed in the last commit.

When we detect such an issue we fix it on disk and ask the agent to amend the most recent commit to incorporate our changes. (We ask the agent to amend rather than silently doing it ourselves so that it is aware that the changes have occurred.)

# Differential

These are code issues that are characterized by having a regression relative to the initial state of the code, such as having tests that are newly failing. (If a test was failing coming in, we should not require the agent to fix it; this could generate unwanted changes and work.)

Detection of these is based on the diff between the initial commit of the repository and the current commit.

When we detect such an issue we inform the agent about it. Some of them could be fixed more or less mechanically but because we are not necessarily confident about it it is better to tell the agent about the possible issue and ask the agent do the work.

Within this category we have both "Info" and "Error" messages, based again on our confidence.

# LLM reviewer

These are code issues that are not detectable mechanically but might be detectable by an LLM reviewer.

We use a large system prompt with guidance on what sorts of issues to look for and how to respond to them. (It is not a general purpose "look for issues", although we should perhaps add one of those as well.) It may also contain extra guidance to help the LLM effectively use its advice, e.g. for recent language/stdlib additions.

This detector is currently marked as experimental.
