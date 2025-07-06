 main

	const handleCreateBranch = () => {
		if (branchName.trim()) {
			createThread(branchName.trim());
			setBranchName("");
			setIsCreatingBranch(false);
		}
	};

	if (!currentThread) {
		return (
			<div className="flex-1 flex items-center justify-center bg-gray-50 p-4">
				<div className="text-center text-gray-500">
					<p className="mb-2">No thread selected.</p>
					<p>Select a thread from the sidebar or create a new one.</p>
				</div>
			</div>
		);
	}

 main
};

export default ChatPane;
