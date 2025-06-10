import itertools
import re
from collections import defaultdict

# implement the following util:
# this should work for max actions 2, 3, 4
#
# I give you as input: for each range (V1, V2, ...) we have a dict
# in this dict there are two elements, for each branch of Hero's action (ch or be)
# these elements specify mixed strategies of Villain conditional on the action of the Hero
#
# example for max actions 4:
# inputs = [
#     # range V1
#     {
#         "ch": {
#             "ch": 0.3,
#             "be-fo": 0.2,
#             "be-ca": 0.5,
#         },
#         "be": {
#             "fo": 0.1,
#             "ca": 0.2,
#             "ra-fo": 0.3,
#             "ra-ca": 0.4,
#         }
#     },
#     # range V2
#     {
#         "ch": {
#             "ch": 0.3,
#             "be-fo": 0.2,
#             "be-ca": 0.5,
#         },
#         "be": {
#             "fo": 0.1,
#             "ca": 0.2,
#             "ra-fo": 0.3,
#             "ra-ca": 0.4,
#         }
#     }
# ]
#
# example for max actions 2-3:
# inputs = [
#     # range V1
#     {
#         "ch": {
#             "ch": 0.3,
#             "be": 0.7,
#         },
#         "be": {
#             "fo": 0.1,
#             "ca": 0.9,
#         }
#     },
#     # range V2
#     {
#         "ch": {
#             "ch": 0.3,
#             "be": 0.7,
#         },
#         "be": {
#             "fo": 0.1,
#             "ca": 0.9,
#         }
#     }
# ]
#
# the probs should always sum up to 1
#
# i want you to compute such mixed strategies, so that their game tree representation should be as above
# the output should be of the form similar to
#
# 0.755,"V1:be-ca/ra-ca,V2:ch/fo"
# 0.106,"V1:be-ca/ra-ca,V2:be-fo/fo"
# 0.089,"V1:be-ca/ra-ca,V2:ch/ra-fo"
# 0.020,"V1:be-fo/ra-ca,V2:ch/fo"
# 0.012,"V1:be-ca/ra-ca,V2:be-fo/ra-fo"
# 0.006,"V1:be-ca/ra-fo,V2:ch/fo"
# 0.003,"V1:be-fo/ra-fo,V2:ch/fo"
# 0.002,"V1:be-fo/ra-ca,V2:be-fo/fo"
# 0.001,"V1:be-ca/ra-ca,V2:be-ca/fo"
# 0.001,"V1:be-fo/ra-ca,V2:be-ca/fo"

def generate_villain_strategies(input_ranges_data):
    """
    Generates combined pure strategies for Villain based on mixed strategy inputs.

    Args:
        input_ranges_data: A list of dictionaries. Each dictionary represents a
                           Villain range (V1, V2, ...) and contains "ch" and "be"
                           keys. These keys map to dictionaries of
                           {action_string: probability} for Villain's conditional
                           mixed strategy.

    Returns:
        A list of strings, where each string is formatted as:
        "probability,\"V1:action_ch/action_be,V2:action_ch/action_be,...\""
    """
    all_ranges_component_choices = []

    for i, range_data in enumerate(input_ranges_data):
        ch_options = list(range_data["ch"].items())  # List of (action_str, prob)
        be_options = list(range_data["be"].items())  # List of (action_str, prob)

        current_range_component_choices = []
        # Each component choice for a single range Vi is a pair of items:
        # ( (ch_action_str, ch_action_prob), (be_action_str, be_action_prob) )
        # This represents one pure strategy for this specific range Vi.
        for ch_item in ch_options:
            for be_item in be_options:
                current_range_component_choices.append((ch_item, be_item))
        
        all_ranges_component_choices.append(current_range_component_choices)

    output_lines = []
    # itertools.product generates all combinations by picking one pure strategy component
    # from each range's list of choices.
    for combined_pure_strategy_tuple in itertools.product(*all_ranges_component_choices):
        # combined_pure_strategy_tuple is like:
        # ( V1_pure_strat_component, V2_pure_strat_component, ... )
        # where V1_pure_strat_component = ( ('ch_A_str', p_ch_A), ('be_A_str', p_be_A) )

        current_overall_prob = 1.0
        strategy_parts_str_list = []  # To build "V1:A/B", "V2:C/D", ...

        for i, range_pure_strategy_component in enumerate(combined_pure_strategy_tuple):
            ch_item, be_item = range_pure_strategy_component
            
            ch_action_str, ch_action_prob = ch_item
            be_action_str, be_action_prob = be_item

            # The probability of this part of the combined pure strategy
            # (i.e., for this specific range Vi choosing this specific ch_action and be_action)
            # is ch_action_prob * be_action_prob.
            # The overall probability is the product of these across all ranges.
            current_overall_prob *= (ch_action_prob * be_action_prob)
            
            range_label = f"V{i+1}"
            strategy_parts_str_list.append(f"{range_label}:{ch_action_str}/{be_action_str}")
        
        final_strategy_string_for_line = ",".join(strategy_parts_str_list)
        
        # Format: probability,"StrategyString"
        # Round probability to 3 decimal places
        output_lines.append(f'{current_overall_prob:.3f},"{final_strategy_string_for_line}"')

    # Sort by probability (descending)
    # The probability is the first part of the string, before the comma.
    output_lines.sort(key=lambda x: float(x.split(',')[0]), reverse=True)

    return output_lines

def parse_strategies_to_input_format(strategy_lines: list[str]) -> list[dict]:
    """
    Converts a list of combined pure strategy strings back into the
    nested dictionary format used as input for generate_villain_strategies.

    Args:
        strategy_lines: A list of strings, where each string is formatted as:
                        "probability,\"V1:action_ch1/action_be1,V2:action_ch2/action_be2,...\""

    Returns:
        A list of dictionaries, where each dictionary represents a Villain range
        (V1, V2, ...) and contains "ch" and "be" keys. These keys map to
        dictionaries of {action_string: probability}.
    """
    if not strategy_lines:
        return []

    num_ranges = 0
    # Determine number of ranges from the first valid line
    for line_idx, line_content in enumerate(strategy_lines):
        try:
            _first_line_prob_str, first_line_combined_strat_part = line_content.split(',', 1)
            first_line_combined_strat_str = first_line_combined_strat_part.strip('"')
            if not first_line_combined_strat_str: # Empty strategy string part
                if line_idx == len(strategy_lines) -1: # If it's the last line and still no num_ranges
                    print("Warning: Could not determine number of ranges from any strategy line.")
                    return []
                continue # Try next line
            num_ranges = len(first_line_combined_strat_str.split(','))
            if num_ranges > 0:
                break # Found num_ranges
        except Exception:
            if line_idx == len(strategy_lines) -1:
                print("Warning: Could not determine number of ranges from any strategy line (parsing error).")
                return []
            continue # Try next line
    
    if num_ranges == 0: # If loop finished without finding num_ranges
        print("Warning: No valid strategy lines found to determine number of ranges.")
        return []


    # Step 1: Initialize data structure to store sum of probabilities for each pure strategy of each range
    # range_pure_strategy_probs[i] maps (ch_action, be_action) to P_i(ch_action/be_action)
    range_pure_strategy_probs = [defaultdict(float) for _ in range(num_ranges)]

    # Step 2: Process all input lines to populate range_pure_strategy_probs
    for line_idx, line in enumerate(strategy_lines):
        try:
            prob_str, combined_strat_part = line.split(',', 1)
            line_prob = float(prob_str)
            combined_strat_str = combined_strat_part.strip('"')
            
            per_range_strat_strs = combined_strat_str.split(',')
            if len(per_range_strat_strs) != num_ranges:
                print(f"Warning: Line {line_idx+1} ('{line}') has inconsistent number of ranges ({len(per_range_strat_strs)} vs expected {num_ranges}). Skipping.")
                continue

            current_line_parsed_strats = [] # Stores (ch_action, be_action) for each range for this line
            for i in range(num_ranges):
                # Example: "V1:be-ca/ra-ca"
                parts = per_range_strat_strs[i].split(':', 1)
                if len(parts) != 2:
                    raise ValueError(f"Malformed range strategy string part: '{per_range_strat_strs[i]}'")
                # range_label = parts[0] # e.g., "V1" - not strictly needed if order is fixed
                actions_full_str = parts[1] # e.g., "be-ca/ra-ca"
                
                ch_be_actions = actions_full_str.split('/', 1)
                if len(ch_be_actions) != 2:
                    raise ValueError(f"Malformed actions part '{actions_full_str}', missing '/' or one side is empty")
                
                ch_action = ch_be_actions[0]
                be_action = ch_be_actions[1]
                current_line_parsed_strats.append((ch_action, be_action))
            
            # Add line_prob to the sum for the specific pure strategy chosen by each range
            for i in range(num_ranges):
                chosen_pure_strat_for_range_i = current_line_parsed_strats[i] # (ch_action, be_action)
                range_pure_strategy_probs[i][chosen_pure_strat_for_range_i] += line_prob
        
        except ValueError as e:
            print(f"Warning: Malformed line {line_idx+1} ('{line}'). Error: {e}. Skipping.")
            continue
        except Exception as e: # Catch any other unexpected errors during line processing
            print(f"Warning: Unexpected error processing line {line_idx+1} ('{line}'). Error: {e}. Skipping.")
            continue

    # Step 3 & 4: Construct the final output list
    output_list_defaultdict = [
        {"ch": defaultdict(float), "be": defaultdict(float)} for _ in range(num_ranges)
    ]

    for i in range(num_ranges):
        for (ch_action, be_action), prob_pure_strat_sum in range_pure_strategy_probs[i].items():
            # prob_pure_strat_sum is P_i(ch_action/be_action)
            output_list_defaultdict[i]["ch"][ch_action] += prob_pure_strat_sum
            output_list_defaultdict[i]["be"][be_action] += prob_pure_strat_sum
            
    # Step 5: Convert defaultdicts to dicts and round probabilities
    final_output_list = []
    for range_data_defaultdict in output_list_defaultdict:
        ch_dict = {k: round(v, 3) for k, v in range_data_defaultdict["ch"].items()}
        be_dict = {k: round(v, 3) for k, v in range_data_defaultdict["be"].items()}
        final_output_list.append({"ch": ch_dict, "be": be_dict})

    return final_output_list


# Example usage:
if __name__ == "__main__":
    import json # For pretty printing the reconstructed input

    # Example for max actions 4 (from problem description)
    inputs_max_4 = [
        # range V1
        {
            "ch": {
                "ch": 0.3,
                "be-fo": 0.2,
                "be-ca": 0.5,
            },
            "be": {
                "fo": 0.1,
                "ca": 0.2,
                "ra-fo": 0.3,
                "ra-ca": 0.4,
            }
        },
        # range V2
        {
            "ch": { 
                "ch": 0.3,
                "be-fo": 0.2,
                "be-ca": 0.5,
            },
            "be": { 
                "fo": 0.1,
                "ca": 0.2,
                "ra-fo": 0.3,
                "ra-ca": 0.4,
            }
        }
    ]
    
    print("Original input for max_actions = 4 example:")
    print(json.dumps(inputs_max_4, indent=4))
    results_max_4 = generate_villain_strategies(inputs_max_4)
    print("\nGenerated strategies for max_actions = 4 example (sorted, prob rounded to .3f):")
    for line in results_max_4:
        print(line)
    
    reconstructed_input_max_4 = parse_strategies_to_input_format(results_max_4)
    print("\nReconstructed input for max_actions = 4 example:")
    print(json.dumps(reconstructed_input_max_4, indent=4))


    # Example for max actions 2-3 (from problem description)
    inputs_max_2_3 = [
        # range V1
        {
            "ch": {
                "ch": 0.3,
                "be": 0.7,
            },
            "be": {
                "fo": 0.1,
                "ca": 0.9,
            }
        },
        # range V2
        {
            "ch": {
                "ch": 0.3,
                "be": 0.7,
            },
            "be": {
                "fo": 0.1,
                "ca": 0.9,
            }
        }
    ]
    print("\nOriginal input for max_actions = 2-3 example:")
    print(json.dumps(inputs_max_2_3, indent=4))
    results_max_2_3 = generate_villain_strategies(inputs_max_2_3)
    print("\nGenerated strategies for max_actions = 2-3 example (sorted, prob rounded to .3f):")
    for line in results_max_2_3:
        print(line)

    reconstructed_input_max_2_3 = parse_strategies_to_input_format(results_max_2_3)
    print("\nReconstructed input for max_actions = 2-3 example:")
    print(json.dumps(reconstructed_input_max_2_3, indent=4))