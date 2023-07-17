using Godot;
using System.Collections.Generic;

namespace FireGame;

public class PlayerStateManager
{
    private readonly Dictionary<PlayerStates, BaseState> allStates;
    private BaseState currentState;

    public PlayerStateManager(Player player)
    {
        allStates = new()
        {
            {PlayerStates.Idle, new Idle()},
            {PlayerStates.Walk, new Walk()},
            {PlayerStates.Fall, new Fall()},
            {PlayerStates.Jump, new Jump()},
        };

        foreach (KeyValuePair<PlayerStates, BaseState> state in allStates)
        {
            state.Value.Player = player;
            state.Value.PlayerSprites = player.GetNode<Node2D>("PlayerSprites");
            state.Value.AnimationPlayer = player.GetNode<AnimationPlayer>("AnimationPlayer");
        }

        currentState = allStates[PlayerStates.Idle];
    }

    private void ChangeState(PlayerStates newState)
    {
        currentState.Exit();
        currentState = allStates[newState];
        currentState.Enter();
    }

    public void Input(InputEvent inputEvent)
    {
        PlayerStates newState = currentState.UpdateInput(inputEvent);
        if (newState != PlayerStates.Null)
        {
            ChangeState(newState);
        }
    }

    public void UpdatePhysics(double delta)
    {
        PlayerStates newState = currentState.UpdatePhysics(delta);
        if (newState != PlayerStates.Null)
        {
            ChangeState(newState);
        }
    }
}
