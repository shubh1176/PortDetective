BINARY_NAME=portmap
INSTALL_DIR=/usr/local/bin

.PHONY: all build build-dashboard build-go install clean

all: build

build: build-dashboard build-go

build-dashboard:
	@echo "Building dashboard..."
	@cd dashboard && npm install && npm run build

build-go:
	@echo "Building Go binary..."
	@go build -o $(BINARY_NAME) ./main.go

install: build
	@echo "Installing to $(INSTALL_DIR)..."
	@sudo mv $(BINARY_NAME) $(INSTALL_DIR)/$(BINARY_NAME)
	@echo "Success! Run '$(BINARY_NAME)' to start."

clean:
	@rm -f $(BINARY_NAME)
	@rm -rf dashboard/out
	@rm -rf dashboard/.next
