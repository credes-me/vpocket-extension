const filesInDirectory = dir =>
	new Promise(resolve =>
		dir.createReader().readEntries(entries => {
			//   console.log(entries.map(e => e.name).filter(n => n.includes("inject")));
			return Promise.all(
				entries
					.filter(e => e.name.includes("inject.bundle.js"))
					.map(e => {
						return new Promise(resolve => e.file(resolve));
					})
			)
				.then(files => [].concat(...files))
				.then(resolve);
		})
	);

const timestampForFilesInDirectory = dir =>
	filesInDirectory(dir).then(files =>
		files.map(f => f.name + f.lastModifiedDate).join()
	);

const reload = () => {
	chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
		// NB: see https://github.com/xpl/crx-hotreload/issues/5

		if (tabs[0]) {
			chrome.tabs.reload(tabs[0].id);
		}

		chrome.runtime.reload();
	});
};

const watchChanges = (dir, lastTimestamp) => {
	timestampForFilesInDirectory(dir).then(timestamp => {
		if (!lastTimestamp || lastTimestamp === timestamp) {
			setTimeout(() => watchChanges(dir, timestamp), 1000); // retry after 1s
		} else {
			reload();
		}
	});
};

chrome.management.getSelf(self => {
	if (
		self.installType === "development" &&
		chrome.runtime.getPackageDirectoryEntry
	) {
		chrome.runtime.getPackageDirectoryEntry(dir => watchChanges(dir));
	}
});