import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrackStatusBar } from "./TrackStatusBar";

describe("TrackStatusBar", () => {
  describe("when no tracks are selected", () => {
    it("displays total track count for multiple tracks", () => {
      render(<TrackStatusBar totalTracks={6} selectedCount={0} />);

      expect(screen.getByText("6 Tracks")).toBeInTheDocument();
    });

    it("displays singular form for one track", () => {
      render(<TrackStatusBar totalTracks={1} selectedCount={0} />);

      expect(screen.getByText("1 Track")).toBeInTheDocument();
    });

    it("displays zero tracks", () => {
      render(<TrackStatusBar totalTracks={0} selectedCount={0} />);

      expect(screen.getByText("0 Tracks")).toBeInTheDocument();
    });

    it("renders accent bar when nothing selected", () => {
      const { container } = render(
        <TrackStatusBar totalTracks={6} selectedCount={0} />,
      );

      expect(
        container.querySelector(".track-status-bar-accent"),
      ).toBeInTheDocument();
    });

    it("does not have selected class when nothing selected", () => {
      const { container } = render(
        <TrackStatusBar totalTracks={6} selectedCount={0} />,
      );

      expect(
        container.querySelector(".track-status-bar-selected"),
      ).not.toBeInTheDocument();
    });
  });

  describe("when one track is selected", () => {
    it("displays selected count with singular form", () => {
      render(<TrackStatusBar totalTracks={6} selectedCount={1} />);

      expect(screen.getByText("1 Track Selected")).toBeInTheDocument();
    });

    it("renders accent bar", () => {
      const { container } = render(
        <TrackStatusBar totalTracks={6} selectedCount={1} />,
      );

      expect(
        container.querySelector(".track-status-bar-accent"),
      ).toBeInTheDocument();
    });

    it("has selected class", () => {
      const { container } = render(
        <TrackStatusBar totalTracks={6} selectedCount={1} />,
      );

      expect(
        container.querySelector(".track-status-bar-selected"),
      ).toBeInTheDocument();
    });
  });

  describe("when multiple tracks are selected", () => {
    it("displays selected count with plural form", () => {
      render(<TrackStatusBar totalTracks={6} selectedCount={3} />);

      expect(screen.getByText("3 Tracks Selected")).toBeInTheDocument();
    });

    it("renders accent bar", () => {
      const { container } = render(
        <TrackStatusBar totalTracks={6} selectedCount={3} />,
      );

      expect(
        container.querySelector(".track-status-bar-accent"),
      ).toBeInTheDocument();
    });

    it("has selected class", () => {
      const { container } = render(
        <TrackStatusBar totalTracks={6} selectedCount={3} />,
      );

      expect(
        container.querySelector(".track-status-bar-selected"),
      ).toBeInTheDocument();
    });
  });
});
