
import { useNavigate } from 'react-router-dom';
import { groupService } from '../../../services/groupService';
import { useModal } from '../../ModalSystem';
import { Group } from '../../../types';

interface GroupChatActionsProps {
    group: Group;
    isCreator: boolean;
    onStartSearch: () => void;
    onStartSelection: () => void;
}

export const useGroupChatActions = ({ group, isCreator, onStartSearch, onStartSelection }: GroupChatActionsProps) => {
    const navigate = useNavigate();
    const { showConfirm, showOptions } = useModal();

    const handleDeleteGroup = async () => {
        const confirmed = await showConfirm(
            "Excluir Grupo", 
            "Deseja realmente apagar este grupo para TODOS os membros? Esta ação é irreversível.", 
            "Excluir", 
            "Cancelar"
        );
        if (confirmed) {
            await groupService.deleteGroup(group.id);
            navigate('/groups');
        }
    };

    const handleLeaveGroup = async () => {
        const confirmMsg = isCreator 
            ? "Você é o dono deste grupo. Ao sair, a posse será transferida automaticamente para um administrador ou membro. Deseja sair?"
            : "Deseja realmente sair deste grupo?";
        
        const confirmed = await showConfirm("Sair do Grupo", confirmMsg, "Sair", "Ficar");
        if (confirmed) {
            await groupService.leaveGroup(group.id);
            navigate('/groups');
        }
    };

    const menuOptions = [
        { 
            label: 'Pesquisar', 
            icon: 'fa-solid fa-magnifying-glass', 
            onClick: onStartSearch 
        },
        { 
            label: 'Limpar Mensagens', 
            icon: 'fa-solid fa-trash-can', 
            onClick: onStartSelection 
        },
        { 
            label: 'Configurações', 
            icon: 'fa-solid fa-gear', 
            onClick: () => navigate(`/group-settings/${group.id}`) 
        },
        isCreator ? { 
            label: 'Excluir Grupo', 
            icon: 'fa-solid fa-trash', 
            onClick: handleDeleteGroup, 
            isDestructive: true 
        } : null,
        { 
            label: 'Sair do Grupo', 
            icon: 'fa-solid fa-right-from-bracket', 
            onClick: handleLeaveGroup, 
            isDestructive: true 
        }
    ].filter(Boolean);

    return { menuOptions };
};
