import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, beforeEach } from "vitest";
import Browse from "../pages/Browse";

describe("Browse Page Filter Chips & Interactivity", () => {
  beforeEach(() => {
    render(
      <MemoryRouter initialEntries={["/browse"]}>
        <Routes>
          <Route path="/browse" element={<Browse />} />
        </Routes>
      </MemoryRouter>
    );
  });

  it("renders active filter chips with remove buttons", () => {
    expect(screen.getAllByText("Laptops").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Refurbished - Grade A").length).toBeGreaterThan(0);

    const removeLaptopBtn = screen.getByRole("button", { name: "Remove filter Laptops" });
    expect(removeLaptopBtn).toBeInTheDocument();
  });

  it("removes active filter chip when close button is clicked", () => {
    const removeLaptopBtn = screen.getByRole("button", { name: "Remove filter Laptops" });
    fireEvent.click(removeLaptopBtn);

    // Laptops chip should no longer exist in the active chips container
    expect(screen.queryByRole("button", { name: "Remove filter Laptops" })).not.toBeInTheDocument();
  });

  it("clears all active filters when Clear All is clicked", () => {
    const clearAllBtns = screen.getAllByText("Clear all");
    fireEvent.click(clearAllBtns[0]);

    expect(screen.queryByRole("button", { name: "Remove filter Laptops" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove filter Refurbished - Grade A" })).not.toBeInTheDocument();
  });

  it("filters products when typing in the search input", () => {
    const searchInputs = screen.getAllByPlaceholderText(/Search/i);
    fireEvent.change(searchInputs[0], { target: { value: "ThinkPad" } });

    expect(screen.getByText(/Lenovo ThinkPad T14/i)).toBeInTheDocument();
  });

  it("toggles category checkboxes and updates filtered results", () => {
    const smartphonesCheckboxes = screen.getAllByRole("checkbox");
    // Check smartphones checkbox
    fireEvent.click(smartphonesCheckboxes[1]);

    expect(screen.getAllByText("Smartphones").length).toBeGreaterThan(0);
  });
});
