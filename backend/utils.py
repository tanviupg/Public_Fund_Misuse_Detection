import pandas as pd

def preprocess(df):
    df = df.copy()

    # Check columns
    required_cols = ["allocated_amount", "spent_amount", "work_status"]
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Missing column: {col}")

    # Encode work_status
    df["work_status"] = df["work_status"].map({
        "Completed": 0,
        "Incomplete": 1
    })

    # Check mapping worked
    if df["work_status"].isnull().any():
        raise ValueError("Invalid value in work_status (must be Completed/Incomplete)")

    # Feature engineering
    df["utilization_ratio"] = df["spent_amount"] / df["allocated_amount"]
    df["difference"] = df["spent_amount"] - df["allocated_amount"]

    # Check for division issues
    if df["utilization_ratio"].isnull().any():
        raise ValueError("Error in utilization_ratio calculation")

    return df[
        [
            "allocated_amount",
            "spent_amount",
            "work_status",
            "utilization_ratio",
            "difference",
        ]
    ]
